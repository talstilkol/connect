#!/usr/bin/env ruby

require "digest"
require "json"
require "pathname"

package_dir = Pathname.new(ARGV[0] || __dir__).expand_path
repository_root = package_dir.join("../../..").cleanpath
package_logical_root = "docs/planning/three-review-protocol-v1-7-package-2026-08-30"

sha256 = lambda { |bytes| Digest::SHA256.hexdigest(bytes) }
frame = lambda do |*values|
  values.map do |value|
    bytes = value.is_a?(String) ? value.b : value.to_s.b
    [bytes.bytesize].pack("Q>") + bytes
  end.join
end
rooted = lambda { |domain, version, *values| sha256.call(frame.call(domain, version, *values)) }
canonical = nil
canonical = lambda do |value|
  case value
  when NilClass then "null"
  when String then JSON.generate(value)
  when TrueClass then "true"
  when FalseClass then "false"
  when Integer then value.to_s
  when Array then "[#{value.map { |item| canonical.call(item) }.join(",")}]"
  when Hash
    "{#{value.keys.sort.map { |key| "#{JSON.generate(key)}:#{canonical.call(value[key])}" }.join(",")}}"
  else
    raise "non-canonical type #{value.class}"
  end
end
line_count = lambda do |bytes|
  next 0 if bytes.empty?
  count = bytes.count("\n")
  bytes.end_with?("\n") ? count : count + 1
end
line_number_at = lambda do |bytes, offset|
  bytes.byteslice(0, offset).count("\n") + 1
end
read_json = lambda { |name| JSON.parse(package_dir.join(name).binread) }
read_jsonl = lambda do |name|
  package_dir.join(name).binread.lines.map(&:strip).reject(&:empty?).map { |line| JSON.parse(line) }
end
logical = lambda { |name| "#{package_logical_root}/#{name}" }

manifest = read_json.call("normative-package-manifest.json")
registry = read_json.call("normative-registry.json")
outputs = read_jsonl.call("requirement-outputs.jsonl")
crosswalk = read_jsonl.call("closure-crosswalk.jsonl")
predecessor = read_jsonl.call("predecessor-closure.jsonl")
predecessor_clauses = read_jsonl.call("predecessor-clause-crosswalk.jsonl")
semantic_predicates = read_jsonl.call("predecessor-semantic-predicates.jsonl")
vectors = read_jsonl.call("causal-vectors.jsonl")
graph = read_json.call("causal-source-graph.json")
semantic_uses = read_jsonl.call("semantic-use-index.jsonl")

counter_names = %w[
  ambiguousStateEventPairs carrierByteMismatch carrierLineMismatch carrierRootMismatch
  causalCycles conjunctDigestMismatch injectedFailurePreconditions invalidRepoRootLocators
  manifestMemberMismatch memberCoreRootMismatch memberDigestMismatch memberLineSpanMismatch
  memberSpanMismatch mergeOrRangeRows missingConstructorInputs missingInitialStates
  missingControlFamilies
  namespaceRootMismatch negativeToSuccess outputRootMismatch parserProfileRootMismatch
  policyRootMismatch predecessorClauseMismatch predecessorClauseSelfOwnedLocators predecessorMismatch
  predecessorSymbolicConjunctLocators selfOwnedLocators semanticPredicateMismatch semanticUseIndexMismatch
  symbolicConjunctLocators undefinedGuards unhandledStateEventPairs unreachableRequiredStates
  unresolvedSemanticUses vectorMismatch
]
counters = counter_names.to_h { |name| [name, 0] }

manifest["payloadMembers"].each do |member|
  path = member["path"]
  unless path.start_with?("#{package_logical_root}/") && !Pathname.new(path).absolute? && !path.split("/").include?("..")
    counters["manifestMemberMismatch"] += 1
    next
  end
  bytes = repository_root.join(path).binread
  counters["manifestMemberMismatch"] += 1 unless sha256.call(bytes) == member["root"] && bytes.bytesize == member["bytes"] && line_count.call(bytes) == member["lines"]
end

carrier_bytes = {}
registry["sourceCarriers"].each do |carrier|
  path = carrier["path"]
  if Pathname.new(path).absolute? || path.start_with?("web/") || path.split("/").include?("..")
    counters["invalidRepoRootLocators"] += 1
    next
  end
  resolved = repository_root.join(path).cleanpath
  unless resolved.to_s.start_with?("#{repository_root}/")
    counters["invalidRepoRootLocators"] += 1
    next
  end
  bytes = resolved.binread
  carrier_bytes[carrier["carrierId"]] = bytes
  counters["carrierRootMismatch"] += 1 unless sha256.call(bytes) == carrier["root"]
  counters["carrierByteMismatch"] += 1 unless bytes.bytesize == carrier["bytes"]
  counters["carrierLineMismatch"] += 1 unless line_count.call(bytes) == carrier["lines"]
end

registry["parserProfiles"].each do |profile|
  core = {
    "mode" => profile["mode"],
    "profileId" => profile["profileId"],
    "repositoryRootRule" => profile["repositoryRootRule"],
    "selectionRule" => profile["selectionRule"]
  }
  counters["parserProfileRootMismatch"] += 1 unless rooted.call("MPRR-V17-PARSER-PROFILE", "1", canonical.call(core)) == profile["parserProfileRoot"]
end

member_by_key = {}
registry["sourceMembers"].each do |member|
  bytes = carrier_bytes[member["carrierId"]]
  if bytes.nil? || member["byteStart"] < 0 || member["byteEndExclusive"] <= member["byteStart"] || member["byteEndExclusive"] > bytes.bytesize
    counters["memberSpanMismatch"] += 1
    next
  end
  selected = bytes.byteslice(member["byteStart"], member["byteEndExclusive"] - member["byteStart"])
  counters["memberDigestMismatch"] += 1 unless sha256.call(selected) == member["memberDigest"]
  unless line_number_at.call(bytes, member["byteStart"]) == member["lineStartInclusive"] && line_number_at.call(bytes, member["byteEndExclusive"]) == member["lineEndExclusive"]
    counters["memberLineSpanMismatch"] += 1
  end
  core = member.reject { |key, _| %w[memberCoreRoot namespaceRoot].include?(key) }
  counters["memberCoreRootMismatch"] += 1 unless rooted.call("MPRR-V17-MEMBER-CORE", "1", canonical.call(core)) == member["memberCoreRoot"]
  member_by_key["#{member["namespaceId"]}/#{member["memberId"]}"] = member
end

registry["sourceNamespaces"].each do |namespace|
  members = registry["sourceMembers"].select { |member| member["namespaceId"] == namespace["namespaceId"] }
  member_set_root = rooted.call("MPRR-V17-MEMBER-SET", "1", *members.map { |member| member["memberCoreRoot"] }.sort)
  counters["namespaceRootMismatch"] += 1 unless member_set_root == namespace["memberSetRoot"] && members.length == namespace["memberCount"]
  core = namespace.reject { |key, _| key == "namespaceRoot" }
  counters["namespaceRootMismatch"] += 1 unless rooted.call("MPRR-V17-NAMESPACE", "1", canonical.call(core)) == namespace["namespaceRoot"]
  counters["namespaceRootMismatch"] += 1 if members.any? { |member| member["namespaceRoot"] != namespace["namespaceRoot"] }
end

generator_root = manifest["producerTools"].find { |item| item["role"] == "DETERMINISTIC-PRODUCER" }["root"]
required_inputs = registry["requirementOutputContract"]["requiredConstructorInputs"]
outputs.each do |output|
  counters["missingConstructorInputs"] += 1 if required_inputs.any? { |key| !output["constructorInputs"].key?(key) }
  expected_output_root = rooted.call("MPRR-V17-REQUIREMENT-OUTPUT", "1", canonical.call(output["constructorInputs"]))
  counters["outputRootMismatch"] += 1 unless expected_output_root == output["outputRoot"]
  expected_receipt = rooted.call("MPRR-V17-PRODUCER-OUTPUT-RECEIPT", "1", output["outputId"], output["outputRoot"], generator_root)
  counters["outputRootMismatch"] += 1 unless expected_receipt == output["producerReceiptRoot"]
  %w[statement defectCauseImpact requiredProofPredicate dependencies sourceBasis].each do |field|
    counters["outputRootMismatch"] += 1 unless sha256.call(output["canonicalFiveFieldValues"][field].b) == output["canonicalFiveFieldDigestVector"][field]
    counters["outputRootMismatch"] += 1 unless sha256.call(output["predecessorFiveFieldValues"][field].b) == output["predecessorFiveFieldDigestVector"][field]
  end
end
unless outputs.length == 112 && outputs.map { |item| item["outputId"] }.uniq.length == 112 && outputs.map { |item| item["requirementId"] }.uniq.length == 112
  counters["outputRootMismatch"] += 1
end

control_by_id = registry["findingControls"].to_h { |item| [item["controlId"], item] }
vector_by_id = vectors.to_h { |item| [item["vectorId"], item] }
output_by_id = outputs.to_h { |item| [item["outputId"], item] }
unless crosswalk.length == 31 && crosswalk.map { |item| item["sourceFindingId"] }.uniq.length == 31 && crosswalk.map { |item| item["crosswalkId"] }.uniq.length == 31
  counters["mergeOrRangeRows"] += 1
end
crosswalk.each do |row|
  unless row["sourceFindingId"].is_a?(String) && row["sourceFindingId"].match?(/^MPRR-V16-IHR-F\d{3}$/) && row["mergePolicy"].start_with?("PROHIBITED")
    counters["mergeOrRangeRows"] += 1
  end
  locators = [row["targetControlLocator"], *row["targetEvidenceLocators"]]
  counters["selfOwnedLocators"] += 1 if locators.any? { |locator| locator.include?("closure-crosswalk.jsonl") }
  control = control_by_id[row["targetControlId"]]
  counters["conjunctDigestMismatch"] += 1 if control.nil? || control["controlRoot"] != row["targetControlRoot"]
  source_member = member_by_key["V16-FINDINGS/#{row["sourceFindingId"]}"]
  if source_member.nil? || source_member["memberDigest"] != row["sourceMemberDigest"] || source_member["memberCoreRoot"] != row["sourceMemberCoreRoot"]
    counters["conjunctDigestMismatch"] += 1
  end
  bytes = carrier_bytes["V16-FINDINGS"]
  row["sourceConjuncts"].each do |conjunct|
    numeric = %w[absoluteByteStart absoluteByteEndExclusive memberRelativeByteStart memberRelativeByteEndExclusive].all? { |key| conjunct[key].is_a?(Integer) }
    counters["symbolicConjunctLocators"] += 1 unless numeric
    counters["symbolicConjunctLocators"] += 1 unless conjunct["sourceLocator"].match?(/#bytes=\d+-\d+$/)
    selected = bytes.byteslice(conjunct["absoluteByteStart"], conjunct["absoluteByteEndExclusive"] - conjunct["absoluteByteStart"])
    counters["conjunctDigestMismatch"] += 1 unless sha256.call(selected) == conjunct["digest"]
    if source_member && (conjunct["absoluteByteStart"] - source_member["byteStart"] != conjunct["memberRelativeByteStart"] || conjunct["absoluteByteEndExclusive"] - source_member["byteStart"] != conjunct["memberRelativeByteEndExclusive"])
      counters["conjunctDigestMismatch"] += 1
    end
  end
  counters["conjunctDigestMismatch"] += 1 if row["vectorIds"].any? { |id| !vector_by_id.key?(id) } || row["targetOutputIds"].any? { |id| !output_by_id.key?(id) }
end

predecessor_clause_by_id = predecessor_clauses.to_h { |item| [item["predecessorCrosswalkId"], item] }
semantic_predicate_by_id = semantic_predicates.to_h { |item| [item["predicateId"], item] }
unless predecessor_clauses.length == 323 && predecessor_clauses.map { |item| item["predecessorCrosswalkId"] }.uniq.length == 323 && predecessor_clauses.map { |item| item["sourceRowId"] }.uniq.length == 323
  counters["predecessorClauseMismatch"] += 1
end
counters["semanticPredicateMismatch"] += 1 unless semantic_predicates.length == 4016 && semantic_predicates.map { |item| item["predicateId"] }.uniq.length == 4016
predecessor_clauses.each do |row|
  core = row.reject { |key, _| key == "predecessorCrosswalkRoot" }
  counters["predecessorClauseMismatch"] += 1 unless rooted.call("MPRR-V17-PREDECESSOR-CLAUSE-ROW", "1", canonical.call(core)) == row["predecessorCrosswalkRoot"]
  unless row["mergePolicy"].start_with?("PROHIBITED") && row["acceptanceCredit"].zero? && row["predicateIds"].length == row["sourceConjuncts"].length && row["predicateRoots"].length == row["predicateIds"].length
    counters["predecessorClauseMismatch"] += 1
  end
  counters["predecessorClauseSelfOwnedLocators"] += 1 if row["targetEvidenceLocators"].any? { |locator| locator.include?("predecessor-clause-crosswalk.jsonl") }
  source_member = member_by_key["#{row["sourceNamespaceId"]}/#{row["sourceMemberId"]}"]
  if source_member.nil? || source_member["memberCoreRoot"] != row["sourceMemberCoreRoot"] || source_member["memberDigest"] != row["sourceMemberDigest"]
    counters["predecessorClauseMismatch"] += 1
    next
  end
  bytes = carrier_bytes[source_member["carrierId"]]
  row["sourceConjuncts"].each_with_index do |conjunct, index|
    numeric = %w[absoluteByteStart absoluteByteEndExclusive memberRelativeByteStart memberRelativeByteEndExclusive].all? { |key| conjunct[key].is_a?(Integer) }
    counters["predecessorSymbolicConjunctLocators"] += 1 unless numeric && conjunct["sourceLocator"].match?(/#bytes=\d+-\d+$/)
    selected = bytes.byteslice(conjunct["absoluteByteStart"], conjunct["absoluteByteEndExclusive"] - conjunct["absoluteByteStart"])
    unless sha256.call(selected) == conjunct["digest"] && conjunct["absoluteByteStart"] - source_member["byteStart"] == conjunct["memberRelativeByteStart"] && conjunct["absoluteByteEndExclusive"] - source_member["byteStart"] == conjunct["memberRelativeByteEndExclusive"]
      counters["predecessorClauseMismatch"] += 1
    end
    predicate = semantic_predicate_by_id[row["predicateIds"][index]]
    unless predicate && predicate["predicateRoot"] == row["predicateRoots"][index] && canonical.call(predicate["sourceConjunct"]) == canonical.call(conjunct) && predicate["predecessorCrosswalkId"] == row["predecessorCrosswalkId"]
      counters["semanticPredicateMismatch"] += 1
    end
  end
  bad_vector = row["vectorIds"].any? { |id| !vector_by_id.key?(id) }
  bad_output = row["targetOutputIds"].any? { |id| !output_by_id.key?(id) }
  bad_root = row["targetOutputRoots"].each_with_index.any? { |root, index| output_by_id.dig(row["targetOutputIds"][index], "outputRoot") != root }
  counters["predecessorClauseMismatch"] += 1 if bad_vector || bad_output || bad_root
  locator_match = row["sourceV16CrosswalkRowLocator"].match(/#bytes=(\d+)-(\d+)$/)
  if locator_match
    selected = carrier_bytes["V16-SUBJECT"].byteslice(locator_match[1].to_i, locator_match[2].to_i - locator_match[1].to_i)
    counters["predecessorClauseMismatch"] += 1 unless sha256.call(selected) == row["sourceV16CrosswalkRowDigest"]
  else
    counters["predecessorClauseMismatch"] += 1
  end
end
semantic_predicates.each do |predicate|
  core = predicate.reject { |key, _| key == "predicateRoot" }
  counters["semanticPredicateMismatch"] += 1 unless rooted.call("MPRR-V17-SEMANTIC-PREDICATE", "1", canonical.call(core)) == predicate["predicateRoot"]
  row = predecessor_clause_by_id[predicate["predecessorCrosswalkId"]]
  counters["semanticPredicateMismatch"] += 1 unless row && row["predicateIds"].include?(predicate["predicateId"])
  predicate["translatedTargetClauses"].each do |target|
    output = output_by_id[target["targetOutputId"]]
    expected_value_root = if output
                            target["targetField"] == "ALL-FIVE-FIELDS" ? output["outputRoot"] : output["canonicalFiveFieldDigestVector"][target["targetField"]]
                          end
    counters["semanticPredicateMismatch"] += 1 unless output && target["targetOutputRoot"] == output["outputRoot"] && target["targetValueRoot"] == expected_value_root
  end
end

registry["policies"].each do |policy|
  expected = rooted.call("MPRR-V17-POLICY", "1", policy["policyId"], policy["policyBytes"])
  counters["policyRootMismatch"] += 1 unless expected == policy["policyRoot"]
end

guard_ids = registry["guards"].map { |item| item["guardId"] }.to_h { |id| [id, true] }
registry["controlTransitions"].each { |transition| counters["undefinedGuards"] += 1 unless guard_ids[transition["guardId"]] }
transitions_by_key = Hash.new { |hash, key| hash[key] = [] }
registry["controlTransitions"].each do |transition|
  transitions_by_key[[transition["machineId"], transition["fromState"], transition["event"]]] << transition
end
registry["controlMachines"].each do |machine|
  counters["missingInitialStates"] += 1 unless machine["initialState"] && machine["states"].include?(machine["initialState"])
  reachable = { machine["initialState"] => true }
  loop do
    changed = false
    registry["controlTransitions"].select { |item| item["machineId"] == machine["machineId"] }.each do |transition|
      if reachable[transition["fromState"]] && !reachable[transition["toState"]]
        reachable[transition["toState"]] = true
        changed = true
      end
    end
    break unless changed
  end
  machine["states"].each do |state|
    machine["events"].each do |event|
      rows = transitions_by_key[[machine["machineId"], state, event]]
      counters["unhandledStateEventPairs"] += 1 if rows.empty?
      counters["ambiguousStateEventPairs"] += 1 if rows.length > 1
    end
    counters["unreachableRequiredStates"] += 1 unless reachable[state]
  end
end
negative_state = /(REJECT|CONFLICT|REVOK|BLOCK|INVALID|STALE|ROLLBACK|SPLIT|QUARANTIN|ABORT|EXPIRED|VETO)/
registry["lifecycleTerminalMap"].each do |mapping|
  counters["negativeToSuccess"] += 1 if mapping["state"].match?(negative_state) && mapping["resultStatus"] == "SUCCESS"
end
vector_families = vectors.map { |vector| vector["family"] }.to_h { |family_name| [family_name, true] }
registry["controlMachines"].each do |machine|
  counters["missingControlFamilies"] += 1 unless vector_families[machine["machineId"].sub(/^MACHINE-/, "")]
end

outgoing = graph["nodes"].to_h { |node| [node["nodeId"], []] }
indegree = graph["nodes"].to_h { |node| [node["nodeId"], 0] }
graph["edges"].each do |edge|
  unless outgoing.key?(edge["from"]) && indegree.key?(edge["to"])
    counters["causalCycles"] += 1
    next
  end
  outgoing[edge["from"]] << edge["to"]
  indegree[edge["to"]] += 1
  if edge["relation"].include?("PRECONDITION") || (edge["from"].start_with?("EXPECTED-ORACLE:") && !edge["to"].start_with?("ORACLE-COMPARISON:"))
    counters["injectedFailurePreconditions"] += 1
  end
end
queue = indegree.select { |_, degree| degree.zero? }.keys.sort
visited = 0
until queue.empty?
  id = queue.shift
  visited += 1
  outgoing[id].each do |next_id|
    indegree[next_id] -= 1
    queue << next_id if indegree[next_id].zero?
  end
  queue.sort!
end
counters["causalCycles"] += 1 unless visited == graph["nodes"].length
counters["injectedFailurePreconditions"] += graph["injectedFailurePreconditionEdges"] unless graph["injectedFailurePreconditionEdges"].zero?

target_sets = {
  "CONTROL-MACHINE" => registry["controlMachines"].map { |item| item["machineId"] }.to_h { |id| [id, true] },
  "EXTERNAL-INPUT-BLOCK" => registry["externalInputBlocks"].map { |item| item["blockId"] }.to_h { |id| [id, true] },
  "FINDING-CONTROL" => registry["findingControls"].map { |item| item["controlId"] }.to_h { |id| [id, true] },
  "GUARD" => registry["guards"].map { |item| item["guardId"] }.to_h { |id| [id, true] },
  "POLICY" => registry["policies"].map { |item| item["policyId"] }.to_h { |id| [id, true] },
  "PREDECESSOR-CLAUSE-ROW" => predecessor_clauses.map { |item| item["predecessorCrosswalkId"] }.to_h { |id| [id, true] },
  "REQUIREMENT-OUTPUT" => outputs.map { |item| item["outputId"] }.to_h { |id| [id, true] },
  "REQUIREMENT" => outputs.map { |item| item["requirementId"] }.to_h { |id| [id, true] },
  "SCHEMA" => registry["schemas"].map { |item| item["schemaId"] }.to_h { |id| [id, true] },
  "SEMANTIC-PREDICATE" => semantic_predicates.map { |item| item["predicateId"] }.to_h { |id| [id, true] },
  "SOURCE-FINDING" => registry["sourceMembers"].select { |item| item["namespaceId"] == "V16-FINDINGS" }.map { |item| item["memberId"] }.to_h { |id| [id, true] },
  "SOURCE-REQUIREMENT" => registry["sourceMembers"].select { |item| item["namespaceId"] == "V16-REQUIREMENTS" }.map { |item| item["memberId"] }.to_h { |id| [id, true] },
  "TERMINAL" => registry["terminalRegistry"].map { |item| item["terminalId"] }.to_h { |id| [id, true] },
  "VECTOR" => vectors.map { |item| item["vectorId"] }.to_h { |id| [id, true] }
}
discovered_uses = []
traverse = nil
traverse = lambda do |value, artifact_path, pointer = ""|
  if value.is_a?(Array)
    value.each_with_index { |item, index| traverse.call(item, artifact_path, "#{pointer}/#{index}") }
    next
  end
  next unless value.is_a?(Hash)
  value.each do |key, child|
    escaped = key.gsub("~", "~0").gsub("/", "~1")
    child_pointer = "#{pointer}/#{escaped}"
    target_kind = registry["semanticUseDiscovery"]["referenceFieldKinds"].key?(key) ? registry["semanticUseDiscovery"]["referenceFieldKinds"][key] : nil
    if target_kind
      values = child.is_a?(Array) ? child : [child]
      values.each_with_index do |target_id, occurrence_index|
        next unless target_id.is_a?(String)
        identity = "#{artifact_path}|#{child_pointer}|#{occurrence_index}|#{target_kind}|#{target_id}"
        resolution = target_sets[target_kind] && target_sets[target_kind][target_id] ? "RESOLVED" : "UNRESOLVED"
        discovered_uses << {
          "artifactPath" => artifact_path,
          "jsonPointer" => child_pointer,
          "occurrenceIndex" => occurrence_index,
          "referenceField" => key,
          "resolution" => resolution,
          "targetId" => target_id,
          "targetKind" => target_kind,
          "useId" => "MPRR-V17-USE-#{sha256.call(identity.b)[0, 32].upcase}"
        }
      end
    end
    traverse.call(child, artifact_path, child_pointer) unless key == "referenceFieldKinds"
  end
end
traverse.call(registry, logical.call("normative-registry.json"))
outputs.each_with_index { |record, index| traverse.call(record, logical.call("requirement-outputs.jsonl"), "/#{index}") }
crosswalk.each_with_index { |record, index| traverse.call(record, logical.call("closure-crosswalk.jsonl"), "/#{index}") }
predecessor.each_with_index { |record, index| traverse.call(record, logical.call("predecessor-closure.jsonl"), "/#{index}") }
predecessor_clauses.each_with_index { |record, index| traverse.call(record, logical.call("predecessor-clause-crosswalk.jsonl"), "/#{index}") }
semantic_predicates.each_with_index { |record, index| traverse.call(record, logical.call("predecessor-semantic-predicates.jsonl"), "/#{index}") }
vectors.each_with_index { |record, index| traverse.call(record, logical.call("causal-vectors.jsonl"), "/#{index}") }
markdown_reference_patterns = [
  [/MPRR-V16-IHR-F\d{3}/, "SOURCE-FINDING"],
  [/MPRR-V16-REQ-\d{3}/, "SOURCE-REQUIREMENT"],
  [/MPRR-V17-CONTROL-F\d{3}/, "FINDING-CONTROL"],
  [/MPRR-V17-REQ-\d{3}/, "REQUIREMENT"],
  [/MPRR-V17-OUT-\d{3}/, "REQUIREMENT-OUTPUT"],
  [/EXT-[A-Z0-9-]+/, "EXTERNAL-INPUT-BLOCK"]
]
subject_bytes = package_dir.join("subject.md").binread
markdown_reference_patterns.each do |pattern, target_kind|
  offset = 0
  while (match = pattern.match(subject_bytes, offset))
    byte_start = match.begin(0)
    byte_end_exclusive = match.end(0)
    artifact_path = logical.call("subject.md")
    json_pointer = "#bytes=#{byte_start}-#{byte_end_exclusive}"
    target_id = match[0]
    identity = "#{artifact_path}|#{json_pointer}|0|#{target_kind}|#{target_id}"
    resolution = target_sets[target_kind] && target_sets[target_kind][target_id] ? "RESOLVED" : "UNRESOLVED"
    discovered_uses << {
      "artifactPath" => artifact_path,
      "jsonPointer" => json_pointer,
      "occurrenceIndex" => 0,
      "referenceField" => "markdownToken",
      "resolution" => resolution,
      "targetId" => target_id,
      "targetKind" => target_kind,
      "useId" => "MPRR-V17-USE-#{sha256.call(identity.b)[0, 32].upcase}"
    }
    offset = byte_end_exclusive
  end
end
discovered_uses.sort_by! { |item| item["useId"] }
counters["semanticUseIndexMismatch"] += 1 unless canonical.call(discovered_uses) == canonical.call(semantic_uses)
counters["unresolvedSemanticUses"] += discovered_uses.count { |item| item["resolution"] != "RESOLVED" }

unless predecessor.length == 128 && predecessor.count { |item| item["predecessorKind"] == "V1.5-FINDING" } == 16 && predecessor.count { |item| item["predecessorKind"] == "V1.6-REQUIREMENT" } == 112
  counters["predecessorMismatch"] += 1
end
counters["predecessorMismatch"] += 1 unless predecessor.map { |item| item["preservationId"] }.uniq.length == predecessor.length

terminal_by_id = registry["terminalRegistry"].to_h { |item| [item["terminalId"], item] }
external_by_id = registry["externalInputBlocks"].to_h { |item| [item["blockId"], item] }
policy_roots = registry["policies"].map { |item| item["policyRoot"] }.to_h { |root| [root, true] }
transition_for = lambda do |machine_id, state, event|
  rows = transitions_by_key[[machine_id, state, event]]
  rows.length == 1 ? rows.first : nil
end
deep_copy = lambda { |value| JSON.parse(JSON.generate(value)) }

execute_vector = lambda do |vector|
  fixture = vector["fixture"]
  terminal_id = "TERM-MALFORMED"
  case vector["kind"]
  when "SOURCE_MEMBER_MUTATION"
    bytes = repository_root.join(fixture["sourcePath"]).binread
    selected = bytes.byteslice(fixture["byteStart"], fixture["byteEndExclusive"] - fixture["byteStart"]).dup
    if sha256.call(selected) == fixture["expectedPreDigest"] && fixture["mutationOffsetWithinMember"] >= 0 && fixture["mutationOffsetWithinMember"] < selected.bytesize
      offset = fixture["mutationOffsetWithinMember"]
      selected.setbyte(offset, selected.getbyte(offset) ^ fixture["mutationXorMask"])
      terminal_id = sha256.call(selected) == fixture["expectedPostDigest"] && sha256.call(selected) != fixture["expectedPreDigest"] ? "TERM-SOURCE-GRAPH-INVALID" : "TERM-MALFORMED"
    end
  when "SOURCE_GRAPH_CLEAN"
    clean = %w[invalidRepoRootLocators carrierRootMismatch memberDigestMismatch memberCoreRootMismatch namespaceRootMismatch].all? { |key| counters[key].zero? }
    terminal_id = clean ? "TERM-MECHANICAL-CLEAN" : "TERM-SOURCE-GRAPH-INVALID"
  when "OBSERVED_STATE_EVALUATION"
    observation = fixture["observation"]
    if registry["failureConditions"].any? { |condition| ![true, false].include?(observation[condition["path"]]) }
      terminal_id = "TERM-MALFORMED"
    else
      triggered = registry["failureConditions"].select { |condition| observation[condition["path"]] == condition["operand"] }.sort_by { |condition| condition["precedence"] }
      terminal_id = triggered.empty? ? "TERM-MECHANICAL-CLEAN" : triggered.first["terminalId"]
    end
  when "CPB1_FRAMING"
    separate = rooted.call(fixture["domain"], fixture["version"], *fixture["fields"])
    suffixed = rooted.call("#{fixture["domain"]}-#{fixture["version"]}", "", *fixture["fields"])
    terminal_id = separate != suffixed ? "TERM-MECHANICAL-CLEAN" : "TERM-CANONICAL-INVALID"
  when "OUTPUT_ALL_RECOMPUTE"
    terminal_id = counters["outputRootMismatch"].zero? && counters["missingConstructorInputs"].zero? && fixture["outputIds"].length == 112 ? "TERM-MECHANICAL-CLEAN" : "TERM-OUTPUT-INVALID"
  when "SEMANTIC_USE_UNINDEXED"
    kind = registry["semanticUseDiscovery"]["referenceFieldKinds"][fixture["injectedField"]]
    terminal_id = kind && target_sets[kind][fixture["injectedTargetId"]] ? "TERM-SEMANTIC-USE-INVALID" : "TERM-MALFORMED"
  when "POLICY_ROOTS_RECOMPUTE"
    terminal_id = counters["policyRootMismatch"].zero? && fixture["policyIds"].length == registry["policies"].length ? "TERM-MECHANICAL-CLEAN" : "TERM-CANONICAL-INVALID"
  when "EXTERNAL_INPUT_GATE"
    block = external_by_id[fixture["blockId"]]
    terminal_id = block && block["state"] == fixture["expectedState"] && block["missingBlockRoot"] == fixture["missingBlockRoot"] ? "TERM-BLOCKED" : "TERM-MALFORMED"
  when "OPERATION_KEY_MUTATION"
    mutated = deep_copy.call(registry["commitContract"]["precommitEnvelope"])
    mutated[fixture["fieldName"]] = fixture["alternateValue"]
    changed_key = rooted.call("MPRR-V17-OPERATION-KEY", "1", canonical.call(mutated))
    terminal_id = changed_key != fixture["baseOperationKey"] ? "TERM-CAS-ABORTED" : "TERM-MALFORMED"
  when "DETACHED_BINDING"
    terminal_id = fixture["leftValue"] != fixture["rightValue"] ? "TERM-CAS-ABORTED" : "TERM-MALFORMED"
  when "CAS_RACE"
    terminal_id = fixture["expectedRoot"] != fixture["racedObservedRoot"] ? "TERM-CAS-ABORTED" : "TERM-MALFORMED"
  when "CAS_MISSING_COMPARISON"
    comparison = registry["commitContract"]["casComparisons"].find { |item| item["comparisonId"] == fixture["comparisonId"] }
    terminal_id = comparison && [comparison["expectedRoot"], comparison["observedRoot"], comparison["revocationHead"]].any?(&:nil?) ? "TERM-CAS-ABORTED" : "TERM-MALFORMED"
  when "REPLAY_CASE"
    decision = if fixture["sameKey"] && fixture["sameEnvelope"]
                 fixture["caseId"] == "RESPONSE-LOSS" ? "READ-ORIGINAL-RECEIPT-BY-EXACT-OPERATION-KEY" : "RETURN-ORIGINAL-EXACT-RECEIPT"
               elsif fixture["sameKey"]
                 "CONFLICT"
               else
                 "CAS-ABORT"
               end
    terminal_id = if decision != fixture["expectedDecision"]
                    "TERM-MALFORMED"
                  elsif decision.include?("RECEIPT")
                    "TERM-MECHANICAL-CLEAN"
                  else
                    "TERM-CAS-ABORTED"
                  end
  when "READBACK_DIVERGENCE"
    terminal_id = fixture["revocationRequired"] && fixture["committedRoot"] != fixture["observedReadbackRoot"] ? "TERM-READBACK-DIVERGED" : "TERM-MALFORMED"
  when "MACHINE_TRANSITION"
    transition = transition_for.call(fixture["machineId"], fixture["fromState"], fixture["event"])
    terminal_id = transition ? transition["terminalId"] : "TERM-MALFORMED"
  when "MACHINE_TRACE"
    machine = registry["controlMachines"].find { |item| item["machineId"] == fixture["machineId"] }
    state = machine && machine["initialState"]
    transition = nil
    fixture["events"].each do |event|
      transition = transition_for.call(fixture["machineId"], state, event)
      break unless transition
      state = transition["toState"]
    end
    terminal_id = transition && state == fixture["expectedState"] ? transition["terminalId"] : "TERM-MALFORMED"
  when "PUBLIC_PROJECTION"
    unsafe = fixture["payloadBytes"] != registry["publicProjectionPolicy"]["onlyAllowedBytes"] || fixture["fieldClasses"].any? { |field_class| registry["publicProjectionPolicy"]["forbiddenFieldClasses"].include?(field_class) }
    missing = fixture.fetch("requiredExternalBlocks", []).any? { |id| external_by_id[id] && external_by_id[id]["state"] == "MISSING-EXTERNAL-INPUT" }
    terminal_id = unsafe ? "TERM-PUBLIC-UNSAFE" : (missing ? "TERM-BLOCKED" : "TERM-MECHANICAL-CLEAN")
  when "MEDIA_POLICY"
    metadata = fixture["metadata"]
    limits = registry["mediaContract"]["limits"]
    exceeds = metadata["byteLength"] > limits["maxEncodedBytes"] || metadata["width"] > limits["maxWidth"] || metadata["height"] > limits["maxHeight"] || metadata["width"] * metadata["height"] > limits["maxPixels"] || metadata["frameCount"] > limits["maxFrames"]
    decoder_missing = limits["approvedDecoderRoots"].empty? || (external_by_id[fixture["requiredExternalBlock"]] && external_by_id[fixture["requiredExternalBlock"]]["state"] == "MISSING-EXTERNAL-INPUT")
    terminal_id = exceeds || decoder_missing || metadata["decoderDisagreement"] || !limits["allowedCodecSet"].include?(metadata["declaredCodec"]) ? "TERM-MEDIA-QUARANTINED" : "TERM-MECHANICAL-CLEAN"
  when "DEPENDENCY_COVERAGE"
    good = fixture["familyIds"].length == registry["dependencyUniverse"]["familyRecords"].length && fixture["instrumentedReads"].uniq.length == registry["dependencyUniverse"]["instrumentedReads"].length
    terminal_id = good ? "TERM-MECHANICAL-CLEAN" : "TERM-DEPENDENCY-STALE"
  when "MODEL_CHECK_ALL"
    clean = %w[undefinedGuards ambiguousStateEventPairs unhandledStateEventPairs missingInitialStates unreachableRequiredStates negativeToSuccess missingControlFamilies].all? { |key| counters[key].zero? }
    terminal_id = clean ? "TERM-MECHANICAL-CLEAN" : "TERM-BLOCKED"
  end
  terminal_id = "TERM-MALFORMED" unless terminal_by_id.key?(terminal_id) && policy_roots[vector["policyRoot"]]
  { "actualAuthorityOutputs" => 0, "actualTerminal" => terminal_id, "vectorId" => vector["vectorId"] }
end

vector_results = vectors.map { |vector| execute_vector.call(vector) }
vectors.each_with_index do |vector, index|
  result = vector_results[index]
  result_root = rooted.call("MPRR-V17-EXPECTED-VECTOR-RESULT", "1", result["vectorId"], result["actualTerminal"], result["actualAuthorityOutputs"].to_s)
  unless result["actualTerminal"] == vector["expectedTerminal"] && result["actualAuthorityOutputs"] == vector["expectedAuthorityOutputs"] && result_root == vector["expectedResultRoot"]
    counters["vectorMismatch"] += 1
  end
end

status = counters.values.all?(&:zero?) ? "PASS" : "FAIL"
vector_result_set_root = rooted.call("MPRR-V17-VECTOR-RESULT-SET", "1", *vector_results.map { |result| canonical.call(result) }.sort)
common_result_root = rooted.call("MPRR-V17-COMMON-QA-RESULT", "1", manifest["packageRoot"], canonical.call(counters), vector_result_set_root)
report = {
  "Acceptance" => 0,
  "Gate29" => "BLOCKED",
  "authorityOutputs" => 0,
  "commonResultRoot" => common_result_root,
  "counters" => counters,
  "developmentFreeze" => "ACTIVE",
  "independentReceipt" => "MISSING-EXTERNAL-INPUT",
  "manifestRoot" => sha256.call(package_dir.join("normative-package-manifest.json").binread),
  "packageRoot" => manifest["packageRoot"],
  "readerId" => "MPRR-V17-READER-B",
  "readerKind" => "PRODUCER-MECHANICAL;NOT-INDEPENDENT-HOSTILE-REVIEW",
  "repository" => "PUBLIC-PERMANENT",
  "status" => status,
  "vectorResultSetRoot" => vector_result_set_root,
  "verifiedCounts" => {
    "carriers" => registry["sourceCarriers"].length,
    "closureRows" => crosswalk.length,
    "guards" => registry["guards"].length,
    "outputs" => outputs.length,
    "predecessorClauseRows" => predecessor_clauses.length,
    "predecessorRows" => predecessor.length,
    "predecessorSemanticPredicates" => semantic_predicates.length,
    "semanticUses" => semantic_uses.length,
    "transitions" => registry["controlTransitions"].length,
    "vectors" => vectors.length
  }
}
package_dir.join("qa-reader-b-report.json").binwrite("#{canonical.call(report)}\n")
exit(1) unless status == "PASS"
