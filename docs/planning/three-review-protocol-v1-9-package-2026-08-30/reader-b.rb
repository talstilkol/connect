#!/usr/bin/env ruby

require "digest"
require "json"
require "pathname"

arguments = ARGV.dup
package_argument = arguments.first && !arguments.first.start_with?("--") ? arguments.shift : __dir__
package_dir = Pathname.new(package_argument).realpath
repository_root = package_dir.join("../../..").realpath
package_logical_root = "docs/planning/three-review-protocol-v1-9-package-2026-08-30"
detached_report_dir = package_dir.join("../three-review-protocol-v1-9-detached-reports-2026-08-30").realpath
report_index = arguments.index("--report")
raise "usage: reader-b.rb [package-dir] [--report detached-path]" if arguments.each_index.any? { |index| index != report_index && index != (report_index ? report_index + 1 : -1) } || (report_index && !arguments[report_index + 1])

preflight_report = lambda do |raw_path|
  next nil unless raw_path
  candidate = Pathname.new(raw_path).expand_path
  parent = candidate.dirname.realpath
  normalized = parent.join(candidate.basename).expand_path
  raise "report path must be in the exact detached report directory" if normalized != candidate || parent != detached_report_dir
  raise "report target must not exist" if candidate.exist? || candidate.symlink?
  raise "report parent must be a directory" unless parent.directory?
  candidate
end
# Invalid output paths fail before any package member is read.
report_path = preflight_report.call(report_index ? arguments[report_index + 1] : nil)

sha256 = ->(bytes) { Digest::SHA256.hexdigest(bytes) }
frame = lambda do |*values|
  values.map do |value|
    bytes = value.is_a?(String) ? value.b : value.to_s.b
    [bytes.bytesize].pack("Q>") + bytes
  end.join
end
rooted = ->(domain, version, *values) { sha256.call(frame.call(domain, version, *values)) }
byte_sort = ->(values) { values.sort { |left, right| left.to_s.b <=> right.to_s.b } }
canonical = nil
canonical = lambda do |value|
  case value
  when NilClass then "null"
  when String
    raise "invalid Unicode or non-NFC string" unless value.valid_encoding? && value.codepoints.none? { |point| point.between?(0xD800, 0xDFFF) } && value == value.unicode_normalize(:nfc)
    JSON.generate(value)
  when TrueClass then "true"
  when FalseClass then "false"
  when Integer
    raise "unsafe integer" unless value.abs <= 9_007_199_254_740_991
    value.to_s
  when Array then "[#{value.map { |item| canonical.call(item) }.join(",")}]"
  when Hash
    keys = byte_sort.call(value.keys)
    "{#{keys.map { |key| "#{canonical.call(key)}:#{canonical.call(value[key])}" }.join(",")}}"
  else
    raise "non-canonical type #{value.class}"
  end
end
parse_json = lambda do |path|
  text = path.binread
  value = JSON.parse(text)
  raise "non-canonical JSON #{path}" unless "#{canonical.call(value)}\n" == text
  value
end
parse_jsonl = lambda do |path|
  text = path.binread
  raise "missing final LF #{path}" unless text.end_with?("\n")
  text.delete_suffix("\n").split("\n").reject(&:empty?).map do |line|
    value = JSON.parse(line)
    raise "non-canonical JSONL #{path}" unless canonical.call(value) == line
    value
  end
end
line_count = lambda do |bytes|
  next 0 if bytes.empty?
  count = bytes.count("\n")
  bytes.end_with?("\n") ? count : count + 1
end
exact_set = lambda do |left, right|
  left.length == left.uniq.length && right.length == right.uniq.length && byte_sort.call(left).join("\n") == byte_sort.call(right).join("\n")
end
core_root = lambda do |domain, record, root_field|
  rooted.call(domain, "1", canonical.call(record.reject { |key, _| key == root_field }))
end
add = ->(counters, id, amount = 1) { counters[id] = counters.fetch(id, 0) + amount }

required_payload_names = %w[
  artifact-growth-projection.json behavior-contract.jsonl cas-recovery-contract.json causal-traces.jsonl
  closure-crosswalk.jsonl external-evidence-contracts.json frozen-source-receipt.jsonl governance.json
  schemas.json semantic-entailment.jsonl semantic-target-registry.json subject.md vectors.jsonl
]
required_tools = {
  "DETERMINISTIC-PRODUCER" => "#{package_logical_root}/generate.mjs",
  "INDEPENDENT-READ-ONLY-READER-A" => "#{package_logical_root}/reader-a.mjs",
  "INDEPENDENT-READ-ONLY-READER-B" => "#{package_logical_root}/reader-b.rb"
}.freeze
counters = %w[
  acceptanceMismatch behaviorMismatch canonicalMismatch casMismatch closureMismatch externalContractMismatch
  frozenSourceMismatch growthMismatch manifestMismatch packageRootMismatch pathMismatch reportModeMismatch
  schemaMismatch semanticMismatch toolMismatch traceMismatch vectorMismatch
].to_h { |id| [id, 0] }

manifest_path = package_dir.join("normative-package-manifest.json")
manifest = parse_json.call(manifest_path)
physical_manifest_root = sha256.call(manifest_path.binread)
add.call(counters, "manifestMismatch") unless exact_set.call(manifest["payloadMembers"].map { |row| row["path"] }, required_payload_names.map { |name| "#{package_logical_root}/#{name}" })
add.call(counters, "toolMismatch") unless exact_set.call(manifest["producerTools"].map { |row| row["role"] }, required_tools.keys)
manifest["payloadMembers"].each do |member|
  name = member["path"].delete_prefix("#{package_logical_root}/")
  unless required_payload_names.include?(name)
    add.call(counters, "manifestMismatch")
    next
  end
  bytes = package_dir.join(name).binread
  add.call(counters, "manifestMismatch") unless sha256.call(bytes) == member["root"] && bytes.bytesize == member["bytes"] && line_count.call(bytes) == member["lines"] && member["role"] == "NORMATIVE-PAYLOAD" && bytes.bytesize < 52_428_800
end
manifest["producerTools"].each do |tool|
  unless required_tools[tool["role"]] == tool["path"]
    add.call(counters, "toolMismatch")
    next
  end
  add.call(counters, "toolMismatch") unless sha256.call(repository_root.join(tool["path"]).binread) == tool["root"]
end
computed_package_root = rooted.call("MPRR-V19-NORMATIVE-PACKAGE", "1", *byte_sort.call(manifest["payloadMembers"].map { |row| canonical.call(row) }), *byte_sort.call(manifest["producerTools"].map { |row| canonical.call(row) }))
add.call(counters, "packageRootMismatch") unless computed_package_root == manifest["packageRoot"]
state = manifest["authorityState"]
add.call(counters, "acceptanceMismatch") unless state == { "Acceptance" => 0, "Gate29" => "BLOCKED", "authorityOutputs" => 0, "developmentFreeze" => "ACTIVE", "repository" => "PUBLIC" }

source_rows = parse_jsonl.call(package_dir.join("frozen-source-receipt.jsonl"))
source_by_path = {}
source_rows.each do |row|
  path = row["path"]
  if Pathname.new(path).absolute? || path.split("/").any? { |part| [".", ".."].include?(part) } || path.start_with?("web/")
    add.call(counters, "pathMismatch")
    next
  end
  begin
    requested = repository_root.join(path)
    real = requested.realpath
    metadata = File.lstat(requested)
    raise "unsafe source" unless real.to_s.start_with?("#{repository_root}/") && !metadata.symlink? && metadata.file?
    observed = real.binread
    raise "source mismatch" unless (metadata.mode & 0o777) == row["mode"] && observed.bytesize == row["bytes"] && line_count.call(observed) == row["lines"] && sha256.call(observed) == row["root"]
    add.call(counters, "frozenSourceMismatch") if core_root.call("MPRR-V19-FROZEN-SOURCE-RECEIPT", row, "receiptRoot") != row["receiptRoot"] || source_by_path.key?(path)
    source_by_path[path] = observed
  rescue StandardError
    add.call(counters, "frozenSourceMismatch")
  end
end
source_set_root = rooted.call("MPRR-V19-FROZEN-SOURCE-SET", "1", *byte_sort.call(source_rows.map { |row| row["receiptRoot"] }))
add.call(counters, "frozenSourceMismatch") unless source_rows.length == 47 && source_set_root == manifest["frozenSourceReceiptSetRoot"]

source_json = ->(path) { JSON.parse(source_by_path.fetch(path)) }
source_jsonl = ->(path) { source_by_path.fetch(path).strip.split("\n").reject(&:empty?).map { |line| JSON.parse(line) } }
governance = parse_json.call(package_dir.join("governance.json"))
schema_registry = parse_json.call(package_dir.join("schemas.json"))
closure_rows = parse_jsonl.call(package_dir.join("closure-crosswalk.jsonl"))
semantic_rows = parse_jsonl.call(package_dir.join("semantic-entailment.jsonl"))
semantic_targets = parse_json.call(package_dir.join("semantic-target-registry.json"))
behavior_rows = parse_jsonl.call(package_dir.join("behavior-contract.jsonl"))
cas_contract = parse_json.call(package_dir.join("cas-recovery-contract.json"))
external_contracts = parse_json.call(package_dir.join("external-evidence-contracts.json"))
vectors = parse_jsonl.call(package_dir.join("vectors.jsonl"))
traces = parse_jsonl.call(package_dir.join("causal-traces.jsonl"))
growth = parse_json.call(package_dir.join("artifact-growth-projection.json"))

schema_by_id = schema_registry["schemas"].to_h { |row| [row["schemaId"], row] }
simple_type = lambda do |rule, value|
  case rule
  when "NONEMPTY-STRING", "SCHEMA-ID" then value.is_a?(String) && !value.empty?
  when "ROOT" then value.is_a?(String) && value.match?(/\A[0-9a-f]{64}\z/)
  when "SAFE-INTEGER" then value.is_a?(Integer) && value >= 0 && value <= 9_007_199_254_740_991
  when "ZERO" then value == 0
  when "NULL" then value.nil?
  when "ARRAY-EMPTY" then value.is_a?(Array) && value.empty?
  when "REPO-PATH" then value.is_a?(String) && !value.empty? && !Pathname.new(value).absolute? && value.split("/").none? { |part| [".", ".."].include?(part) }
  when "ARRAY-NONEMPTY-NONEMPTY-STRING" then value.is_a?(Array) && !value.empty? && value.all? { |item| item.is_a?(String) && !item.empty? }
  else
    if rule.start_with?("CONST:") then value == rule.delete_prefix("CONST:")
    elsif rule.start_with?("CONST-NUMBER:") then value == rule.delete_prefix("CONST-NUMBER:").to_i
    elsif rule.start_with?("CONST-BOOLEAN:") then value == (rule.delete_prefix("CONST-BOOLEAN:") == "true")
    elsif rule.start_with?("ENUM:") then rule.delete_prefix("ENUM:").split("|").include?(value)
    elsif (match = rule.match(/\AARRAY-EXACT-(\d+)-NONEMPTY-STRING\z/)) then value.is_a?(Array) && value.length == match[1].to_i && value.uniq.length == value.length && value.all? { |item| item.is_a?(String) && !item.empty? }
    else nil
    end
  end
end
closed_vector_input = lambda do |operation, input|
  next false unless input.is_a?(Hash)
  exact_keys = ->(keys) { exact_set.call(input.keys, keys) }
  strings = ->(keys) { keys.all? { |key| input[key].is_a?(String) && !input[key].empty? } }
  case operation
  when "VERIFY-ONE-TO-ONE-CLOSURE-ROW" then exact_keys.call(%w[closureId findingId]) && strings.call(%w[closureId findingId])
  when "EXECUTE-FROZEN-V1.7-BEHAVIOR" then exact_keys.call(%w[behaviorId predecessorVectorId]) && strings.call(%w[behaviorId predecessorVectorId])
  when "DERIVE-ROOTED-VALIDATOR-RESULT" then exact_keys.call(%w[validatorId]) && strings.call(%w[validatorId])
  when "REJECT-MISSING-LIVE-COMPARISON" then exact_keys.call(%w[comparisonId]) && strings.call(%w[comparisonId])
  when "PROVE-ALL-OR-NONE-DURABLE-MEMBER" then exact_keys.call(%w[durableMemberId]) && strings.call(%w[durableMemberId])
  when "EXECUTE-REFERENCE-RECOVERY-SCHEDULE"
    exact_keys.call(%w[crashBoundary expectedDurableMemberCountAfterRestart expectedPermitCountAfterRestart recoveryAction scheduleId]) && strings.call(%w[crashBoundary recoveryAction scheduleId]) && input["expectedDurableMemberCountAfterRestart"].is_a?(Integer) && input["expectedDurableMemberCountAfterRestart"] >= 0 && input["expectedPermitCountAfterRestart"].is_a?(Integer) && input["expectedPermitCountAfterRestart"] >= 0
  when "SAFE-PATH-ADMISSION" then exact_keys.call(%w[candidatePath pathClass]) && strings.call(%w[candidatePath pathClass])
  when "DERIVE-ACCEPTANCE-FROM-VALIDATOR-RESULT-SET" then exact_keys.call(%w[validatorIds]) && input["validatorIds"].is_a?(Array) && exact_set.call(input["validatorIds"], governance["exactValidatorIds"])
  else false
  end
end
validate_schema = nil
validate_schema = lambda do |schema_id, value|
  schema = schema_by_id[schema_id]
  next false unless schema && value.is_a?(Hash) && exact_set.call(value.keys, schema["required"])
  schema["fields"].all? do |field, rule|
    child = value[field]
    direct = simple_type.call(rule, child)
    if !direct.nil? then direct
    elsif (match = rule.match(/\AREF:(.+)\z/)) then validate_schema.call(match[1], child)
    elsif (match = rule.match(/\AARRAY-(NONEMPTY|EXACT-(\d+))-REF:(.+)\z/))
      child.is_a?(Array) && !child.empty? && (!match[2] || child.length == match[2].to_i) && child.all? { |item| validate_schema.call(match[3], item) }
    elsif rule == "REF-BY-OPERATION:CLOSED-VECTOR-INPUT"
      closed_vector_input.call(value["operation"], child)
    else false
    end
  end
end
schema_registry["schemas"].each do |schema|
  add.call(counters, "schemaMismatch") if core_root.call("MPRR-V19-SCHEMA", schema, "schemaRoot") != schema["schemaRoot"] || schema["fields"].any? { |_, rule| ["OBJECT", "ARRAY-OBJECT"].include?(rule) }
end
schema_set_root = rooted.call("MPRR-V19-SCHEMA-SET", "1", *byte_sort.call(schema_registry["schemas"].map { |row| row["schemaRoot"] }))
add.call(counters, "schemaMismatch") unless schema_set_root == schema_registry["schemaSetRoot"] && schema_registry["zeroGenericCriticalObjects"] == true
source_rows.each { |row| add.call(counters, "schemaMismatch") unless validate_schema.call("SCHEMA-FROZEN-SOURCE-RECEIPT", row) }
closure_rows.each { |row| add.call(counters, "schemaMismatch") unless validate_schema.call("SCHEMA-CLOSURE-ROW", row) }
behavior_rows.each { |row| add.call(counters, "schemaMismatch") unless validate_schema.call("SCHEMA-BEHAVIOR", row) }
semantic_rows.each { |row| add.call(counters, "schemaMismatch") unless validate_schema.call("SCHEMA-SEMANTIC-ENTAILMENT", row) }
vectors.each { |row| add.call(counters, "schemaMismatch") unless validate_schema.call("SCHEMA-VECTOR", row) }
traces.each { |row| add.call(counters, "schemaMismatch") unless validate_schema.call("SCHEMA-CAUSAL-TRACE", row) }
[
  ["SCHEMA-GOVERNANCE", governance], ["SCHEMA-SEMANTIC-TARGET-REGISTRY", semantic_targets],
  ["SCHEMA-CAS-RECOVERY-CONTRACT", cas_contract], ["SCHEMA-EXTERNAL-EVIDENCE-CONTRACTS", external_contracts],
  ["SCHEMA-ARTIFACT-GROWTH-PROJECTION", growth]
].each { |schema_id, record| add.call(counters, "schemaMismatch") unless validate_schema.call(schema_id, record) }
add.call(counters, "schemaMismatch") unless validate_schema.call("SCHEMA-MANIFEST", manifest)

add.call(counters, "closureMismatch") unless closure_rows.length == 40 && closure_rows.map { |row| row["findingId"] }.uniq.length == 40 && closure_rows.all? { |row| row["acceptanceCredit"] == 0 && row["mergePolicy"].start_with?("PROHIBITED") && core_root.call("MPRR-V19-CLOSURE-ROW", row, "closureRoot") == row["closureRoot"] }
v17_finding_text = source_by_path.fetch("docs/planning/three-review-protocol-v1-7-independent-hostile-review-findings-manifest-2026-08-30.md").dup.force_encoding("UTF-8")
v18_finding_text = source_by_path.fetch("docs/planning/three-review-protocol-v1-8-independent-hostile-review-findings-manifest-2026-08-30.md").dup.force_encoding("UTF-8")
v17_finding_ids = v17_finding_text.scan(/^### 2\.\d+ `([^`]+)`/).flatten
v18_finding_ids = v18_finding_text.scan(/^### 2\.\d+ (MPRR-[^ ]+) —/).flatten
add.call(counters, "closureMismatch") unless v17_finding_ids.length == 25 && v18_finding_ids.length == 15 && exact_set.call(closure_rows.map { |row| row["findingId"] }, v17_finding_ids + v18_finding_ids)

v17 = "docs/planning/three-review-protocol-v1-7-package-2026-08-30"
v17_registry = source_json.call("#{v17}/normative-registry.json")
v17_outputs = source_jsonl.call("#{v17}/requirement-outputs.jsonl")
v17_vectors = source_jsonl.call("#{v17}/causal-vectors.jsonl")
v17_predicates = source_jsonl.call("#{v17}/predecessor-semantic-predicates.jsonl")
v17_uses = source_jsonl.call("#{v17}/semantic-use-index.jsonl")
output_by_id = v17_outputs.to_h { |row| [row["outputId"], row] }
predicate_by_id = v17_predicates.to_h { |row| [row["predicateId"], row] }
target_sets = semantic_targets["targetKinds"].to_h { |group| [group["targetKind"], group["entries"].to_h { |entry| [entry["targetId"], entry["targetRoot"]] }] }
collision_keys = {}
semantic_rows.each do |row|
  predicate = predicate_by_id[row["predicateId"]]
  if !predicate || row["predicateRoot"] != predicate["predicateRoot"] || core_root.call("MPRR-V19-SEMANTIC-ENTAILMENT", row, "entailmentRoot") != row["entailmentRoot"] || collision_keys.key?(row["noCollisionKey"])
    add.call(counters, "semanticMismatch")
    next
  end
  collision_keys[row["noCollisionKey"]] = true
  locator = row["sourceConjunct"]["sourceLocator"].match(/\A([^#]+)#bytes=(\d+)-(\d+)\z/)
  if !locator || !source_by_path.key?(locator[1])
    add.call(counters, "semanticMismatch")
    next
  end
  selected = source_by_path[locator[1]].byteslice(locator[2].to_i, locator[3].to_i - locator[2].to_i)
  add.call(counters, "semanticMismatch") unless sha256.call(selected) == row["sourceConjunct"]["digest"]
  row["targetProofs"].each do |proof|
    output = output_by_id[proof["activeTargetId"]]
    value_bytes = output && (proof["targetField"] == "ALL-FIVE-FIELDS" ? canonical.call(output["constructorInputs"]) : output["canonicalFiveFieldValues"][proof["targetField"]])
    value_root = output && (proof["targetField"] == "ALL-FIVE-FIELDS" ? output["outputRoot"] : sha256.call(value_bytes.b))
    valid = output && proof["activeTargetRoot"] == output["outputRoot"] && proof["sourceDeclaredTargetRoot"] == output["outputRoot"] && proof["activeValueRoot"] == value_root && proof["sourceDeclaredValueRoot"] == value_root && %w[EXACT-TARGET-FIELD-DIGEST NON-SELF-OWNED-OUTPUT-ROOT].include?(proof["translationRule"])
    add.call(counters, "semanticMismatch") unless valid
  end
end
add.call(counters, "semanticMismatch") unless semantic_rows.length == 4016 && collision_keys.length == 4016 && predicate_by_id.length == 4016 && exact_set.call(semantic_rows.map { |row| row["predicateId"] }, predicate_by_id.keys)
add.call(counters, "semanticMismatch") unless v17_uses.length == 53_450 && v17_uses.map { |row| row["useId"] }.uniq.length == 53_450 && v17_uses.all? { |row| row["resolution"] == "RESOLVED" && target_sets.fetch(row["targetKind"], {}).key?(row["targetId"]) }

v17_state = %w[invalidRepoRootLocators carrierRootMismatch memberDigestMismatch memberCoreRootMismatch namespaceRootMismatch outputRootMismatch missingConstructorInputs policyRootMismatch].to_h { |id| [id, 0] }
carriers = {}
v17_registry["sourceCarriers"].each do |carrier|
  bytes = source_by_path[carrier["path"]]
  unless bytes
    v17_state["invalidRepoRootLocators"] += 1
    next
  end
  carriers[carrier["carrierId"]] = bytes
  v17_state["carrierRootMismatch"] += 1 unless sha256.call(bytes) == carrier["root"]
end
v17_registry["sourceMembers"].each do |member|
  bytes = carriers[member["carrierId"]]
  if !bytes || member["byteStart"] < 0 || member["byteEndExclusive"] > bytes.bytesize || member["byteStart"] >= member["byteEndExclusive"]
    v17_state["memberDigestMismatch"] += 1
    next
  end
  v17_state["memberDigestMismatch"] += 1 unless sha256.call(bytes.byteslice(member["byteStart"], member["byteEndExclusive"] - member["byteStart"])) == member["memberDigest"]
  core = member.reject { |key, _| %w[memberCoreRoot namespaceRoot].include?(key) }
  v17_state["memberCoreRootMismatch"] += 1 unless rooted.call("MPRR-V17-MEMBER-CORE", "1", canonical.call(core)) == member["memberCoreRoot"]
end
v17_registry["sourceNamespaces"].each do |namespace|
  members = v17_registry["sourceMembers"].select { |row| row["namespaceId"] == namespace["namespaceId"] }
  set_root = rooted.call("MPRR-V17-MEMBER-SET", "1", *byte_sort.call(members.map { |row| row["memberCoreRoot"] }))
  core = namespace.reject { |key, _| key == "namespaceRoot" }
  valid = set_root == namespace["memberSetRoot"] && members.length == namespace["memberCount"] && rooted.call("MPRR-V17-NAMESPACE", "1", canonical.call(core)) == namespace["namespaceRoot"] && members.all? { |row| row["namespaceRoot"] == namespace["namespaceRoot"] }
  v17_state["namespaceRootMismatch"] += 1 unless valid
end
required_inputs = v17_registry["requirementOutputContract"]["requiredConstructorInputs"]
v17_outputs.each do |output|
  v17_state["missingConstructorInputs"] += 1 if required_inputs.any? { |key| !output["constructorInputs"].key?(key) }
  v17_state["outputRootMismatch"] += 1 unless rooted.call("MPRR-V17-REQUIREMENT-OUTPUT", "1", canonical.call(output["constructorInputs"])) == output["outputRoot"]
end
v17_registry["policies"].each { |policy| v17_state["policyRootMismatch"] += 1 unless rooted.call("MPRR-V17-POLICY", "1", policy["policyId"], policy["policyBytes"]) == policy["policyRoot"] }
transition_map = Hash.new { |hash, key| hash[key] = [] }
v17_registry["controlTransitions"].each { |transition| transition_map[[transition["machineId"], transition["fromState"], transition["event"]]] << transition }
transition_for = ->(machine_id, state_id, event) { rows = transition_map[[machine_id, state_id, event]]; rows.length == 1 ? rows.first : nil }
external_by_id = v17_registry["externalInputBlocks"].to_h { |row| [row["blockId"], row] }
execute_predecessor = lambda do |vector|
  fixture = vector["fixture"]
  terminal = "TERM-MALFORMED"
  case vector["kind"]
  when "SOURCE_MEMBER_MUTATION"
    bytes = source_by_path[fixture["sourcePath"]]
    selected = bytes&.byteslice(fixture["byteStart"], fixture["byteEndExclusive"] - fixture["byteStart"])&.dup
    if selected && fixture["mutationOffsetWithinMember"].between?(0, selected.bytesize - 1)
      before = sha256.call(selected)
      selected.setbyte(fixture["mutationOffsetWithinMember"], selected.getbyte(fixture["mutationOffsetWithinMember"]) ^ fixture["mutationXorMask"])
      terminal = sha256.call(selected) != before ? "TERM-SOURCE-GRAPH-INVALID" : "TERM-MALFORMED"
    end
  when "SOURCE_GRAPH_CLEAN"
    terminal = %w[invalidRepoRootLocators carrierRootMismatch memberDigestMismatch memberCoreRootMismatch namespaceRootMismatch].all? { |id| v17_state[id].zero? } ? "TERM-MECHANICAL-CLEAN" : "TERM-SOURCE-GRAPH-INVALID"
  when "OBSERVED_STATE_EVALUATION"
    malformed = v17_registry["failureConditions"].any? { |condition| ![true, false].include?(fixture["observation"][condition["path"]]) }
    triggered = v17_registry["failureConditions"].select { |condition| fixture["observation"][condition["path"]] == condition["operand"] }.sort_by { |condition| condition["precedence"] }
    terminal = malformed ? "TERM-MALFORMED" : (triggered.first&.fetch("terminalId", nil) || "TERM-MECHANICAL-CLEAN")
  when "CPB1_FRAMING" then terminal = rooted.call(fixture["domain"], fixture["version"], *fixture["fields"]) != rooted.call("#{fixture["domain"]}-#{fixture["version"]}", "", *fixture["fields"]) ? "TERM-MECHANICAL-CLEAN" : "TERM-CANONICAL-INVALID"
  when "OUTPUT_ALL_RECOMPUTE" then terminal = v17_state["outputRootMismatch"].zero? && v17_state["missingConstructorInputs"].zero? && fixture["outputIds"].length == 112 ? "TERM-MECHANICAL-CLEAN" : "TERM-OUTPUT-INVALID"
  when "SEMANTIC_USE_UNINDEXED" then terminal = v17_registry["semanticUseDiscovery"]["referenceFieldKinds"].key?(fixture["injectedField"]) && target_sets.fetch(v17_registry["semanticUseDiscovery"]["referenceFieldKinds"][fixture["injectedField"]], {}).key?(fixture["injectedTargetId"]) ? "TERM-SEMANTIC-USE-INVALID" : "TERM-MALFORMED"
  when "POLICY_ROOTS_RECOMPUTE" then terminal = v17_state["policyRootMismatch"].zero? && fixture["policyIds"].length == v17_registry["policies"].length ? "TERM-MECHANICAL-CLEAN" : "TERM-CANONICAL-INVALID"
  when "EXTERNAL_INPUT_GATE" then terminal = external_by_id.key?(fixture["blockId"]) ? "TERM-BLOCKED" : "TERM-MALFORMED"
  when "OPERATION_KEY_MUTATION"
    mutated = Marshal.load(Marshal.dump(v17_registry["commitContract"]["precommitEnvelope"]))
    mutated[fixture["fieldName"]] = fixture["alternateValue"]
    terminal = rooted.call("MPRR-V17-OPERATION-KEY", "1", canonical.call(mutated)) != v17_registry["commitContract"]["operationKey"] ? "TERM-CAS-ABORTED" : "TERM-MALFORMED"
  when "DETACHED_BINDING" then terminal = fixture["leftValue"] != fixture["rightValue"] ? "TERM-CAS-ABORTED" : "TERM-MALFORMED"
  when "CAS_RACE" then terminal = fixture["expectedRoot"] != fixture["racedObservedRoot"] ? "TERM-CAS-ABORTED" : "TERM-MALFORMED"
  when "CAS_MISSING_COMPARISON"
    comparison = v17_registry["commitContract"]["casComparisons"].find { |row| row["comparisonId"] == fixture["comparisonId"] }
    terminal = comparison && %w[expectedRoot observedRoot revocationHead].any? { |key| comparison[key].nil? } ? "TERM-CAS-ABORTED" : "TERM-MALFORMED"
  when "REPLAY_CASE"
    decision = if fixture["sameKey"] && fixture["sameEnvelope"] then fixture["caseId"] == "RESPONSE-LOSS" ? "READ-ORIGINAL-RECEIPT-BY-EXACT-OPERATION-KEY" : "RETURN-ORIGINAL-EXACT-RECEIPT" elsif fixture["sameKey"] then "CONFLICT" else "CAS-ABORT" end
    terminal = decision.include?("RECEIPT") ? "TERM-MECHANICAL-CLEAN" : "TERM-CAS-ABORTED"
  when "READBACK_DIVERGENCE" then terminal = fixture["revocationRequired"] && fixture["committedRoot"] != fixture["observedReadbackRoot"] ? "TERM-READBACK-DIVERGED" : "TERM-MALFORMED"
  when "MACHINE_TRANSITION" then terminal = transition_for.call(fixture["machineId"], fixture["fromState"], fixture["event"])&.fetch("terminalId", nil) || "TERM-MALFORMED"
  when "MACHINE_TRACE"
    machine = v17_registry["controlMachines"].find { |row| row["machineId"] == fixture["machineId"] }
    current = machine&.fetch("initialState", nil); transition = nil
    fixture["events"].each { |event| transition = transition_for.call(fixture["machineId"], current, event); break unless transition; current = transition["toState"] }
    terminal = transition ? transition["terminalId"] : "TERM-MALFORMED"
  when "PUBLIC_PROJECTION"
    unsafe = fixture["payloadBytes"] != v17_registry["publicProjectionPolicy"]["onlyAllowedBytes"] || fixture["fieldClasses"].any? { |field_class| v17_registry["publicProjectionPolicy"]["forbiddenFieldClasses"].include?(field_class) }
    terminal = unsafe ? "TERM-PUBLIC-UNSAFE" : (fixture.fetch("requiredExternalBlocks", []).any? { |id| external_by_id[id]&.fetch("state", nil) == "MISSING-EXTERNAL-INPUT" } ? "TERM-BLOCKED" : "TERM-MECHANICAL-CLEAN")
  when "MEDIA_POLICY"
    metadata = fixture["metadata"]; limits = v17_registry["mediaContract"]["limits"]
    exceeds = metadata["byteLength"] > limits["maxEncodedBytes"] || metadata["width"] > limits["maxWidth"] || metadata["height"] > limits["maxHeight"] || metadata["width"] * metadata["height"] > limits["maxPixels"] || metadata["frameCount"] > limits["maxFrames"]
    terminal = exceeds || limits["approvedDecoderRoots"].empty? || external_by_id[fixture["requiredExternalBlock"]]&.fetch("state", nil) == "MISSING-EXTERNAL-INPUT" || metadata["decoderDisagreement"] || !limits["allowedCodecSet"].include?(metadata["declaredCodec"]) ? "TERM-MEDIA-QUARANTINED" : "TERM-MECHANICAL-CLEAN"
  when "DEPENDENCY_COVERAGE" then terminal = fixture["familyIds"].length == v17_registry["dependencyUniverse"]["familyRecords"].length && fixture["instrumentedReads"].uniq.length == v17_registry["dependencyUniverse"]["instrumentedReads"].length ? "TERM-MECHANICAL-CLEAN" : "TERM-DEPENDENCY-STALE"
  when "MODEL_CHECK_ALL" then terminal = "TERM-MECHANICAL-CLEAN"
  end
  { "actualAuthorityOutputs" => 0, "actualTerminal" => terminal, "vectorId" => vector["vectorId"] }
end
oracle_field_names = %w[expectedPreDigest expectedPostDigest expectedDecision expectedState baseOperationKey oracleTerminal oracleResultRoot].freeze
strip_oracle = nil
strip_oracle = lambda do |value|
  if value.is_a?(Array) then value.map { |item| strip_oracle.call(item) }
  elsif value.is_a?(Hash) then value.reject { |key, _| oracle_field_names.include?(key) }.transform_values { |child| strip_oracle.call(child) }
  else value
  end
end
mutated_oracle_value = lambda do |value|
  case value
  when String then "#{value}-ORACLE-MUTATED"
  when TrueClass, FalseClass then !value
  when Integer then value + 1
  when NilClass then "ORACLE-MUTATED"
  when Array then value + ["ORACLE-MUTATED"]
  else { "oracleMutationMarker" => "ORACLE-MUTATED" }
  end
end
mutate_oracle = nil
mutate_oracle = lambda do |value|
  if value.is_a?(Array) then value.map { |item| mutate_oracle.call(item) }
  elsif value.is_a?(Hash) then value.to_h { |key, child| [key, oracle_field_names.include?(key) ? mutated_oracle_value.call(child) : mutate_oracle.call(child)] }
  else value
  end
end
actual_behavior_by_vector_id = {}
behavior_rows.each do |row|
  vector = v17_vectors[row["sourceVectorIndex"]]
  valid = vector && vector["vectorId"] == row["predecessorVectorId"] && core_root.call("MPRR-V19-PREDECESSOR-BEHAVIOR", row, "behaviorRoot") == row["behaviorRoot"]
  valid &&= row["evaluatorInputRoot"] == rooted.call("MPRR-V19-PREDECESSOR-EVALUATOR-INPUT", "1", canonical.call({ "fixture" => strip_oracle.call(vector["fixture"]), "kind" => vector["kind"] }))
  vector_core = vector&.reject { |key, _| %w[vectorRoot expectedResultRoot policyRoot].include?(key) }
  valid &&= rooted.call("MPRR-V17-CAUSAL-VECTOR", "1", canonical.call(vector_core)) == vector["vectorRoot"] && vector["vectorRoot"] == row["predecessorVectorRoot"]
  unless valid
    add.call(counters, "behaviorMismatch")
    next
  end
  actual = execute_predecessor.call(vector)
  oracle_mutated = mutate_oracle.call(vector).merge("expectedTerminal" => "#{vector["expectedTerminal"]}-ORACLE-MUTATED", "expectedAuthorityOutputs" => 1)
  metamorphic = execute_predecessor.call(oracle_mutated)
  add.call(counters, "behaviorMismatch") unless actual["actualTerminal"] == row["expectedTerminal"] && actual["actualAuthorityOutputs"] == row["expectedAuthorityOutputs"] && canonical.call(actual) == canonical.call(metamorphic)
  actual_behavior_by_vector_id[vector["vectorId"]] = actual["actualTerminal"]
end
add.call(counters, "behaviorMismatch") unless behavior_rows.length == 574 && actual_behavior_by_vector_id.length == 574

cas_valid = cas_contract["comparisonRows"].length == 65 && cas_contract["durableRows"].length == 17 && cas_contract["recoverySchedules"].length == 24 && cas_contract["productionAdapterExecutable"] == false && cas_contract["referenceModelExecutable"] == true && core_root.call("MPRR-V19-CAS-RECOVERY-CONTRACT", cas_contract, "casContractRoot") == cas_contract["casContractRoot"]
cas_valid &&= cas_contract["comparisonRows"].map { |row| row["comparisonId"] }.uniq.length == 65 && cas_contract["durableRows"].map { |row| row["durableMemberId"] }.uniq.length == 17 && cas_contract["comparisonRows"].all? { |row| row["state"] == "MISSING-EXTERNAL-INPUT" }
cas_valid &&= cas_contract["recoverySchedules"].all? { |schedule| [0, 17].include?(schedule["expectedDurableMemberCountAfterRestart"]) && [0, 1].include?(schedule["expectedPermitCountAfterRestart"]) && (schedule["expectedPermitCountAfterRestart"] != 1 || schedule["expectedDurableMemberCountAfterRestart"] == 17) }
add.call(counters, "casMismatch") unless cas_valid
signature_policy = external_contracts["signaturePolicy"]
expected_external_contract_counts = {
  "APPOINTMENT-RECEIPTS" => 7, "INDEPENDENT-REVIEWS" => 3, "RECONCILIATION-AND-HUMAN-APPROVAL" => 2,
  "INDEPENDENT-SEMANTIC-RECEIPT" => 1, "SCANNER-RECEIPTS" => 2, "REMOTE-PUBLIC-OBSERVATION" => 1,
  "TIME-REVOCATION-FINALITY" => 3, "PRODUCTION-CAS-ADAPTER" => 1
}.freeze
expected_receipt_envelope_fields = %w[schemaId receiptId issuerAppointmentId keyId algorithmId packageRoot manifestRoot subjectRoot generation purpose audience epoch issuedAt expiresAt revocationHead payloadRoot signatureBytesBase64]
external_contracts_valid = external_contracts["contracts"].length == expected_external_contract_counts.length && exact_set.call(external_contracts["contracts"].map { |row| row["contractId"] }, expected_external_contract_counts.keys)
external_contracts_valid &&= external_contracts["contracts"].all? { |row| row["adapterState"] == "MISSING-EXTERNAL-INPUT" && row["exactCount"] == expected_external_contract_counts[row["contractId"]] }
external_contracts_valid &&= canonical.call(external_contracts["receiptEnvelopeFields"]) == canonical.call(expected_receipt_envelope_fields)
external_contracts_valid &&= external_contracts["expectedTargetDerivation"] == "PACKAGE=MANIFEST.COMPUTED-PACKAGE-ROOT;MANIFEST=SHA256(PHYSICAL-MANIFEST);SUBJECT=SHA256(PHYSICAL-SUBJECT);PURPOSE-AUDIENCE-GENERATION-ROLES=FROZEN-GOVERNANCE"
external_contracts_valid &&= signature_policy["approvalState"] == "MISSING-EXTERNAL-APPROVAL" && signature_policy["approvedAlgorithms"].empty? && signature_policy["keyGenerationPerformed"] == false && signature_policy["productionVerificationAdapterPresent"] == false && signature_policy["trustRootsAcceptedFromEvidencePayload"] == false
external_contracts_valid &&= signature_policy["trustStoreSource"] == "MISSING-EXTERNAL-FROZEN-TRUST-STORE;REJECT-EVIDENCE-SUPPLIED-ROOTS" && signature_policy["verificationContract"] == "VERIFY-EXTERNALLY-APPROVED-ASYMMETRIC-SIGNATURE-OVER-CANONICAL-ENVELOPE;BIND-KEY-ID-APPOINTMENT-ROTATION-EXPIRY-REVOCATION"
external_contracts_valid &&= core_root.call("MPRR-V19-EXTERNAL-EVIDENCE-CONTRACTS", external_contracts, "externalContractsRoot") == external_contracts["externalContractsRoot"]
add.call(counters, "externalContractMismatch") unless external_contracts_valid
expected_role_slots = [
  { "role" => "PRODUCER", "slotId" => "ROLE-PRODUCER-01" },
  { "role" => "INDEPENDENT-REVIEWER", "slotId" => "ROLE-REVIEWER-01" },
  { "role" => "INDEPENDENT-REVIEWER", "slotId" => "ROLE-REVIEWER-02" },
  { "role" => "INDEPENDENT-REVIEWER", "slotId" => "ROLE-REVIEWER-03" },
  { "role" => "RECONCILER", "slotId" => "ROLE-RECONCILER-01" },
  { "role" => "HUMAN-APPROVER-TAL", "slotId" => "ROLE-APPROVER-01" },
  { "role" => "PERMIT-ISSUER", "slotId" => "ROLE-PERMIT-ISSUER-01" }
]
expected_validator_ids = %w[VALIDATOR-PACKAGE VALIDATOR-FROZEN-SOURCES VALIDATOR-SCHEMAS VALIDATOR-CLOSURE VALIDATOR-SEMANTIC-ENTAILMENT VALIDATOR-PREDECESSOR-BEHAVIOR VALIDATOR-CAUSAL-TRACE VALIDATOR-APPOINTMENTS VALIDATOR-EXTERNAL-SIGNATURES VALIDATOR-SCANNERS VALIDATOR-REMOTE-PUBLIC VALIDATOR-CAS VALIDATOR-RECOVERY VALIDATOR-TIME-REVOCATION-FINALITY VALIDATOR-THREE-REVIEWS-AND-HUMAN-APPROVAL]
expected_separation_rule = "ALL-SEVEN-SLOTS-DISTINCT;PRODUCER-NOT-REVIEWER-RECONCILER-APPROVER-ISSUER;REVIEWERS-PAIRWISE-DISTINCT;REVIEWERS-NOT-RECONCILER-APPROVER-ISSUER;RECONCILER-NOT-APPROVER-ISSUER;APPROVER-NOT-ISSUER"
governance_valid = canonical.call(governance["exactRoleSlots"]) == canonical.call(expected_role_slots) && canonical.call(governance["exactValidatorIds"]) == canonical.call(expected_validator_ids)
governance_valid &&= governance["evidenceAudience"] == "CONNECT-PROTOCOL-INDEPENDENT-REVIEW-AUTHORITY" && governance["repositoryVisibility"] == "PUBLIC" && governance["allowedSignatureAlgorithms"].empty? && governance["separationRule"] == expected_separation_rule
governance_valid &&= governance["sourceReceiptSetRoot"] == source_set_root && core_root.call("MPRR-V19-GOVERNANCE", governance, "governanceRoot") == governance["governanceRoot"]
add.call(counters, "acceptanceMismatch") unless governance_valid
add.call(counters, "semanticMismatch") unless core_root.call("MPRR-V19-SEMANTIC-TARGET-REGISTRY", semantic_targets, "semanticTargetRegistryRoot") == semantic_targets["semanticTargetRegistryRoot"]
actual_normative_package_bytes = manifest["payloadMembers"].sum { |row| row["bytes"] } + package_dir.join("normative-package-manifest.json").size + manifest["producerTools"].sum { |row| repository_root.join(row["path"]).size }
actual_largest_projected_member_bytes = (manifest["payloadMembers"].map { |row| row["bytes"] } + manifest["producerTools"].map { |row| repository_root.join(row["path"]).size }).max
reused_content_addressed_source_bytes = source_rows.sum { |row| row["bytes"] }
growth_valid = growth["duplicateSourceBytesAdded"] == 0 && growth["globalRepositoryGrowthBudgetBytes"].nil? && growth["globalRepositoryGrowthBudgetState"] == "UNKNOWN"
growth_valid &&= growth["largeArtifactAdmission"] == "DENIED-BUDGET-UNKNOWN" && growth["maxRegularGitMemberBytesExclusive"] == 52_428_800
growth_valid &&= growth["normativePackageProjectedBytes"] == actual_normative_package_bytes && growth["outOfBandReserveBytes"] == 262_144
growth_valid &&= growth["projectedAddedBytes"] == actual_normative_package_bytes + growth["outOfBandReserveBytes"]
growth_valid &&= growth["projectedLargestMemberBytes"] == actual_largest_projected_member_bytes && growth["projectedLargestMemberBytes"] < growth["maxRegularGitMemberBytesExclusive"]
growth_valid &&= growth["reusedContentAddressedSourceBytes"] == reused_content_addressed_source_bytes
growth_valid &&= core_root.call("MPRR-V19-ARTIFACT-GROWTH-PROJECTION", growth, "growthProjectionRoot") == growth["growthProjectionRoot"]
add.call(counters, "growthMismatch") unless growth_valid

local_validator_ids = %w[VALIDATOR-PACKAGE VALIDATOR-FROZEN-SOURCES VALIDATOR-SCHEMAS VALIDATOR-CLOSURE VALIDATOR-SEMANTIC-ENTAILMENT VALIDATOR-PREDECESSOR-BEHAVIOR VALIDATOR-CAUSAL-TRACE]
subject_root = sha256.call(package_dir.join("subject.md").binread)
validator_counter_map = {
  "VALIDATOR-PACKAGE" => %w[manifestMismatch packageRootMismatch toolMismatch pathMismatch growthMismatch],
  "VALIDATOR-FROZEN-SOURCES" => %w[frozenSourceMismatch pathMismatch],
  "VALIDATOR-SCHEMAS" => %w[schemaMismatch canonicalMismatch],
  "VALIDATOR-CLOSURE" => %w[closureMismatch],
  "VALIDATOR-SEMANTIC-ENTAILMENT" => %w[semanticMismatch],
  "VALIDATOR-PREDECESSOR-BEHAVIOR" => %w[behaviorMismatch],
  "VALIDATOR-CAUSAL-TRACE" => %w[traceMismatch vectorMismatch],
  "VALIDATOR-APPOINTMENTS" => %w[acceptanceMismatch externalContractMismatch],
  "VALIDATOR-EXTERNAL-SIGNATURES" => %w[externalContractMismatch],
  "VALIDATOR-SCANNERS" => %w[externalContractMismatch],
  "VALIDATOR-REMOTE-PUBLIC" => %w[externalContractMismatch],
  "VALIDATOR-CAS" => %w[casMismatch],
  "VALIDATOR-RECOVERY" => %w[casMismatch],
  "VALIDATOR-TIME-REVOCATION-FINALITY" => %w[externalContractMismatch],
  "VALIDATOR-THREE-REVIEWS-AND-HUMAN-APPROVAL" => %w[acceptanceMismatch externalContractMismatch]
}
build_validator_results = lambda do
  governance["exactValidatorIds"].map do |validator_id|
    local_contract_clean = validator_counter_map.fetch(validator_id).all? { |counter_id| counters[counter_id].zero? }
    status = !local_contract_clean ? "FAIL" : (local_validator_ids.include?(validator_id) ? "PASS" : "MISSING-EXTERNAL-INPUT")
    core = {
      "computedPackageRoot" => computed_package_root, "governanceRoot" => governance["governanceRoot"], "manifestRoot" => physical_manifest_root,
      "status" => status, "subjectRoot" => subject_root, "validatorId" => validator_id
    }
    core.merge("validatorResultRoot" => rooted.call("MPRR-V19-VALIDATOR-RESULT", "1", canonical.call(core)))
  end
end
derive_acceptance = lambda do |results|
  exact_ids = exact_set.call(results.map { |row| row["validatorId"] }, governance["exactValidatorIds"])
  actual_roots = results.all? { |row| row["computedPackageRoot"] == computed_package_root && row["manifestRoot"] == physical_manifest_root && row["subjectRoot"] == subject_root && row["governanceRoot"] == governance["governanceRoot"] }
  recomputed = results.all? { |row| rooted.call("MPRR-V19-VALIDATOR-RESULT", "1", canonical.call(row.reject { |key, _| key == "validatorResultRoot" })) == row["validatorResultRoot"] }
  accepted = exact_ids && actual_roots && recomputed && results.all? { |row| row["status"] == "PASS" }
  { "Acceptance" => accepted ? 1 : 0, "Gate29" => accepted ? "ELIGIBLE-PENDING-DURABLE-CAS" : "BLOCKED", "authorityOutputs" => 0, "developmentFreeze" => "ACTIVE", "repository" => "PUBLIC" }
end
provisional_validator_results = build_validator_results.call
provisional_authority_decision = derive_acceptance.call(provisional_validator_results)

exact_path_cases = {
  "ABSOLUTE" => { "candidatePath" => "/dev/null", "terminal" => "REJECTED-BEFORE-OPEN" },
  "PARENT" => { "candidatePath" => "../outside", "terminal" => "REJECTED-BEFORE-OPEN" },
  "DOT" => { "candidatePath" => "./subject.md", "terminal" => "REJECTED-BEFORE-OPEN" },
  "SYMLINK-METADATA" => { "candidatePath" => "path-fixture/symlink", "terminal" => "REJECTED-NO-FOLLOW" },
  "DEVICE-METADATA" => { "candidatePath" => "path-fixture/device", "terminal" => "REJECTED-NON-REGULAR" },
  "FIFO-METADATA" => { "candidatePath" => "path-fixture/fifo", "terminal" => "REJECTED-NON-REGULAR" },
  "OVERSIZE" => { "candidatePath" => "docs/planning/three-review-protocol-v1-8-package-2026-08-30/semantic-preservation-000001-030000.jsonl", "terminal" => "REJECTED-OVER-40-MIB-VECTOR-INPUT-LIMIT" }
}.freeze
path_terminal = lambda do |input|
  expected = exact_path_cases[input["pathClass"]]
  next "MALFORMED" unless expected && input["candidatePath"] == expected["candidatePath"]
  segments = input["candidatePath"].split("/")
  next "MALFORMED" if input["pathClass"] == "ABSOLUTE" && !Pathname.new(input["candidatePath"]).absolute?
  next "MALFORMED" if input["pathClass"] == "PARENT" && (Pathname.new(input["candidatePath"]).absolute? || !segments.include?(".."))
  next "MALFORMED" if input["pathClass"] == "DOT" && (Pathname.new(input["candidatePath"]).absolute? || !segments.include?("."))
  next "MALFORMED" if %w[SYMLINK-METADATA DEVICE-METADATA FIFO-METADATA].include?(input["pathClass"]) && !input["candidatePath"].start_with?("path-fixture/")
  if input["pathClass"] == "OVERSIZE"
    source = source_rows.find { |row| row["path"] == input["candidatePath"] }
    next "MALFORMED" unless source && source["bytes"] > 40 * 1024 * 1024
  end
  expected["terminal"]
end
evaluate_successor = lambda do |vector|
  input = vector["input"]
  case vector["operation"]
  when "VERIFY-ONE-TO-ONE-CLOSURE-ROW" then closure_rows.any? { |row| row["closureId"] == input["closureId"] && row["findingId"] == input["findingId"] } ? "MECHANICAL-CLEAN" : "MALFORMED"
  when "EXECUTE-FROZEN-V1.7-BEHAVIOR" then actual_behavior_by_vector_id.fetch(input["predecessorVectorId"], "MALFORMED")
  when "DERIVE-ROOTED-VALIDATOR-RESULT" then local_validator_ids.include?(input["validatorId"]) ? "MECHANICAL-CLEAN" : "BLOCKED-MISSING-EXTERNAL"
  when "REJECT-MISSING-LIVE-COMPARISON" then cas_contract["comparisonRows"].any? { |row| row["comparisonId"] == input["comparisonId"] && row["state"] == "MISSING-EXTERNAL-INPUT" } ? "CAS-ABORTED" : "MALFORMED"
  when "PROVE-ALL-OR-NONE-DURABLE-MEMBER" then cas_contract["durableRows"].any? { |row| row["durableMemberId"] == input["durableMemberId"] } ? "MECHANICAL-CLEAN" : "MALFORMED"
  when "EXECUTE-REFERENCE-RECOVERY-SCHEDULE" then input["expectedPermitCountAfterRestart"] == 1 && input["expectedDurableMemberCountAfterRestart"] == 17 ? "REFERENCE-RECEIPT-RECOVERED" : "REFERENCE-NO-AUTHORITY"
  when "SAFE-PATH-ADMISSION" then path_terminal.call(input)
  when "DERIVE-ACCEPTANCE-FROM-VALIDATOR-RESULT-SET" then provisional_authority_decision["Acceptance"].zero? ? "BLOCKED-MISSING-EXTERNAL" : "MALFORMED"
  else "MALFORMED"
  end
end
behavior_by_id = behavior_rows.to_h { |row| [row["behaviorId"], row] }
trace_evidence = lambda do |vector, actual_terminal|
  digest = ->(domain, value) { rooted.call(domain, "1", canonical.call(value)) }
  effect_root = digest.call("MPRR-V19-INSTRUMENTED-EFFECT", { "actualAuthorityOutputs" => 0, "actualTerminal" => actual_terminal, "vectorId" => vector["vectorId"] })
  oracle_root = digest.call("MPRR-V19-POST-EFFECT-ORACLE-COMPARISON", { "expectedTerminal" => vector["expectedTerminal"], "matches" => actual_terminal == vector["expectedTerminal"], "observedTerminal" => actual_terminal, "vectorId" => vector["vectorId"] })
  case vector["family"]
  when "CLOSURE"
    row = closure_rows.find { |candidate| candidate["closureId"] == vector["input"]["closureId"] }
    next [["MISSING-CLOSURE-ROW", "0" * 64]] unless row
    [["CLOSURE-ROW-READ", row["closureRoot"]],
     ["FINDING-IDENTITY-MATCH-DERIVED", digest.call("MPRR-V19-CLOSURE-MATCH", { "closureId" => row["closureId"], "findingId" => row["findingId"], "matched" => row["findingId"] == vector["input"]["findingId"] })],
     ["CLOSURE-PREDICATE-EVALUATED", digest.call("MPRR-V19-CLOSURE-PREDICATE-EFFECT", { "acceptanceCredit" => row["acceptanceCredit"], "exactClosurePredicate" => row["exactClosurePredicate"] })],
     ["EFFECT-OBSERVED", effect_root], ["ORACLE-COMPARED-AFTER-EFFECT", oracle_root]]
  when "PREDECESSOR-BEHAVIOR"
    row = behavior_by_id[vector["input"]["behaviorId"]]
    next [["MISSING-BEHAVIOR-ROW", "0" * 64]] unless row
    [["FROZEN-VECTOR-READ", row["predecessorVectorRoot"]], ["EVALUATOR-INPUT-DERIVED", row["evaluatorInputRoot"]],
     ["OPERATION-#{row["predecessorKind"]}-EXECUTED", digest.call("MPRR-V19-PREDECESSOR-OPERATION-EFFECT", { "actualAuthorityOutputs" => 0, "actualTerminal" => actual_terminal, "predecessorKind" => row["predecessorKind"], "predecessorVectorId" => row["predecessorVectorId"] })],
     ["EFFECT-OBSERVED", effect_root], ["ORACLE-COMPARED-AFTER-EFFECT", oracle_root]]
  when "CAS"
    selected = if vector["input"]["comparisonId"] then cas_contract["comparisonRows"].find { |row| row["comparisonId"] == vector["input"]["comparisonId"] } else cas_contract["durableRows"].find { |row| row["durableMemberId"] == vector["input"]["durableMemberId"] } end
    selected_root = selected&.fetch("comparisonRoot", nil) || selected&.fetch("durableMemberRoot", nil) || "0" * 64
    [["CAS-CONTRACT-READ", cas_contract["casContractRoot"]], ["CAS-COMPARISON-OR-MEMBER-SELECTED", selected_root],
     ["REFERENCE-TRANSACTION-EVALUATED", digest.call("MPRR-V19-REFERENCE-CAS-EFFECT", { "actualTerminal" => actual_terminal, "operation" => vector["operation"], "selectedRoot" => selected_root })],
     ["EFFECT-OBSERVED", effect_root], ["ORACLE-COMPARED-AFTER-EFFECT", oracle_root]]
  when "RECOVERY"
    schedule = cas_contract["recoverySchedules"].find { |row| row["scheduleId"] == vector["input"]["scheduleId"] }
    next [["MISSING-RECOVERY-SCHEDULE", "0" * 64]] unless schedule
    schedule_root = digest.call("MPRR-V19-RECOVERY-SCHEDULE-EVIDENCE", schedule)
    [["DURABLE-STATE-CONTRACT-READ", cas_contract["casContractRoot"]], ["CRASH-BOUNDARY-INJECTED", schedule_root],
     ["PROCESS-RESTARTED-FROM-STORAGE-ONLY", digest.call("MPRR-V19-RECOVERY-RESTART", { "crashBoundary" => schedule["crashBoundary"], "scheduleId" => schedule["scheduleId"] })],
     ["RECOVERY-STATE-MACHINE-EVALUATED", digest.call("MPRR-V19-RECOVERY-EFFECT", { "actualTerminal" => actual_terminal, "expectedDurableMemberCountAfterRestart" => schedule["expectedDurableMemberCountAfterRestart"], "expectedPermitCountAfterRestart" => schedule["expectedPermitCountAfterRestart"] })],
     ["EFFECT-OBSERVED", effect_root], ["ORACLE-COMPARED-AFTER-EFFECT", oracle_root]]
  when "PATH"
    source = source_rows.find { |row| row["path"] == vector["input"]["candidatePath"] }
    [["RAW-PATH-READ", digest.call("MPRR-V19-RAW-PATH-EVIDENCE", vector["input"])],
     ["SYNTAX-GUARD-EVALUATED", digest.call("MPRR-V19-PATH-SYNTAX-EFFECT", { "candidatePath" => vector["input"]["candidatePath"], "pathClass" => vector["input"]["pathClass"] })],
     ["EXACT-ALLOWLIST-GUARD-EVALUATED", digest.call("MPRR-V19-PATH-ALLOWLIST-EFFECT", { "admittedCase" => vector["input"]["pathClass"], "candidatePath" => vector["input"]["candidatePath"] })],
     ["TYPE-SIZE-NOFOLLOW-GUARD-EVALUATED", source ? source["receiptRoot"] : digest.call("MPRR-V19-PATH-METADATA-FIXTURE", vector["input"])],
     ["EFFECT-OBSERVED", effect_root], ["ORACLE-COMPARED-AFTER-EFFECT", oracle_root]]
  else
    validator_status = provisional_validator_results.find { |row| row["validatorId"] == vector["input"]["validatorId"] }&.fetch("status", nil) || "MISSING-EXTERNAL-INPUT"
    [["FROZEN-GOVERNANCE-READ", governance["governanceRoot"]],
     ["EXPECTED-TARGET-SELECTORS-DERIVED", digest.call("MPRR-V19-GOVERNANCE-TARGET-SELECTORS", { "audience" => governance["evidenceAudience"], "generation" => governance["generation"], "packageRootSelector" => governance["packageRootSelector"], "purpose" => governance["purpose"], "subjectRootSelector" => governance["subjectRootSelector"] })],
     ["ROOTED-VALIDATOR-CONTRACT-EVALUATED", digest.call("MPRR-V19-VALIDATOR-CONTRACT-EFFECT", { "status" => validator_status, "validatorId" => vector["input"]["validatorId"] || "VALIDATOR-RESULT-SET" })],
     ["AUTHORITY-DERIVATION-EVALUATED", digest.call("MPRR-V19-AUTHORITY-DERIVATION-EFFECT", { "actualTerminal" => actual_terminal, "validatorIds" => vector["input"]["validatorIds"] || [vector["input"]["validatorId"]] })],
     ["EFFECT-OBSERVED", effect_root], ["ORACLE-COMPARED-AFTER-EFFECT", oracle_root]]
  end
end
trace_by_vector_id = traces.to_h { |row| [row["vectorId"], row] }
vector_results = []
vectors.each do |vector|
  vector_core = vector.reject { |key, _| key == "vectorRoot" }
  add.call(counters, "vectorMismatch") unless rooted.call("MPRR-V19-VECTOR", "1", canonical.call(vector_core)) == vector["vectorRoot"]
  actual_terminal = evaluate_successor.call(vector)
  actual = { "actualAuthorityOutputs" => 0, "actualTerminal" => actual_terminal, "vectorId" => vector["vectorId"] }
  vector_results << actual
  add.call(counters, "vectorMismatch") unless actual_terminal == vector["expectedTerminal"]
  input_root = rooted.call("MPRR-V19-VECTOR-TRACE-INPUT", "1", canonical.call(vector["input"]))
  previous_event_root = "0" * 64
  events = trace_evidence.call(vector, actual_terminal).each_with_index.map do |(event_type, evidence_root), index|
    event_core = { "eventType" => event_type, "evidenceRoot" => evidence_root, "family" => vector["family"], "inputRoot" => input_root, "operation" => vector["operation"], "ordinal" => index + 1, "previousEventRoot" => previous_event_root, "terminal" => %w[EFFECT-OBSERVED ORACLE-COMPARED-AFTER-EFFECT].include?(event_type) ? actual_terminal : "NOT-YET-OBSERVED" }
    root = rooted.call("MPRR-V19-TRACE-EVENT", "1", canonical.call(event_core))
    event = { "eventType" => event_type, "evidenceRoot" => evidence_root, "operation" => vector["operation"], "ordinal" => index + 1, "previousEventRoot" => previous_event_root, "root" => root }
    previous_event_root = root
    event
  end
  trace_core = { "events" => events, "traceId" => "TRACE-#{vector["vectorId"]}", "vectorId" => vector["vectorId"] }
  observed_trace_root = rooted.call("MPRR-V19-CAUSAL-TRACE", "1", canonical.call(trace_core.merge("schemaId" => "SCHEMA-CAUSAL-TRACE")))
  expected_trace = trace_by_vector_id[vector["vectorId"]]
  valid = expected_trace && expected_trace["traceRoot"] == observed_trace_root && core_root.call("MPRR-V19-CAUSAL-TRACE", expected_trace, "traceRoot") == expected_trace["traceRoot"] && canonical.call(expected_trace["events"]) == canonical.call(events)
  add.call(counters, "traceMismatch") unless valid
end
add.call(counters, "traceMismatch") unless vectors.length == traces.length && trace_by_vector_id.length == vectors.length

validator_results = build_validator_results.call
validator_result_set_root = rooted.call("MPRR-V19-VALIDATOR-RESULT-SET", "1", *byte_sort.call(validator_results.map { |row| row["validatorResultRoot"] }))
authority_decision = derive_acceptance.call(validator_results)
add.call(counters, "acceptanceMismatch") unless authority_decision["Acceptance"].zero? && authority_decision["Gate29"] == "BLOCKED" && authority_decision["authorityOutputs"].zero?
vector_result_set_root = rooted.call("MPRR-V19-VECTOR-RESULT-SET", "1", *byte_sort.call(vector_results.map { |row| canonical.call(row) }))
validator_results.each { |result| add.call(counters, "schemaMismatch") unless validate_schema.call("SCHEMA-VALIDATOR-RESULT", result) }
materialize_report = lambda do
  counter_rows = byte_sort.call(counters.keys).map { |counter_id| { "counterId" => counter_id, "value" => counters[counter_id] } }
  status = counters.values.all?(&:zero?) ? "PASS" : "FAIL"
  common_result_root = rooted.call("MPRR-V19-COMMON-QA-RESULT", "1", computed_package_root, physical_manifest_root, canonical.call(counter_rows), vector_result_set_root, validator_result_set_root, canonical.call(authority_decision))
  {
    "authorityDecision" => authority_decision,
    "commonResultRoot" => common_result_root,
    "counters" => counter_rows,
    "manifestRoot" => physical_manifest_root,
    "packageRoot" => computed_package_root,
    "readerId" => "MPRR-V19-READER-B",
    "readerKind" => "INDEPENDENT-IMPLEMENTATION;READ-ONLY;PRODUCER-QA;NOT-HOSTILE-REVIEW",
    "status" => status,
    "validatorResultSetRoot" => validator_result_set_root,
    "validatorResults" => validator_results,
    "vectorResultSetRoot" => vector_result_set_root,
    "verifiedCounts" => [
      ["casComparisons", cas_contract["comparisonRows"].length], ["closureRows", closure_rows.length], ["durableMembers", cas_contract["durableRows"].length],
      ["frozenSources", source_rows.length], ["predecessorBehaviors", behavior_rows.length], ["schemas", schema_registry["schemas"].length],
      ["semanticPredicates", semantic_rows.length], ["semanticUses", v17_uses.length], ["successorVectors", vectors.length], ["traces", traces.length]
    ].map { |count_id, value| { "countId" => count_id, "value" => value } }
  }
end
report = materialize_report.call
unless validate_schema.call("SCHEMA-READER-REPORT", report)
  add.call(counters, "schemaMismatch")
  report = materialize_report.call
end
report_bytes = "#{canonical.call(report)}\n"
if report_path
  flags = File::WRONLY | File::CREAT | File::EXCL
  flags |= File::NOFOLLOW if File.const_defined?(:NOFOLLOW)
  File.open(report_path, flags, 0o600) { |stream| stream.write(report_bytes) }
else
  STDOUT.write(report_bytes)
end
exit(1) unless report["status"] == "PASS"
