#!/usr/bin/env ruby

require "digest"
require "json"
require "pathname"
require "set"

READER_ID = "D02A8-READER-B-RUBY".freeze
LOGICAL = {
  "schema" => "docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/schema.json",
  "registry" => "docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/registry.json",
  "dag" => "docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/dependency-dag.json",
  "corpus" => "docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/mutation-corpus.json"
}.freeze
EXPECTED_TOP_LEVEL = [
  "artifactId", "schemaVersion", "canonicalization", "sourceCut", "safeState",
  "frozenInputs", "authorityChain", "predecessorClauseUniverses", "authorityConflict", "modelSelectionAuthority",
  "approvalRegistry", "a6FindingRegistry", "a7FindingRegistry", "aiProfileMembers",
  "promptPolicy", "accountParentRows", "accountChildren", "legalPrivacyMembers",
  "officialSourceReceipts", "rootDefinitions", "rootStates"
].sort.freeze
ID_FIELDS = {
  "frozenInputs" => "inputId",
  "authorityChain" => "nodeId",
  "predecessorClauseUniverses" => "universeId",
  "approvalRegistry" => "approvalId",
  "a6FindingRegistry" => "findingId",
  "a7FindingRegistry" => "findingId",
  "aiProfileMembers" => "memberId",
  "accountParentRows" => "rowId",
  "accountChildren" => "childId",
  "legalPrivacyMembers" => "memberId",
  "officialSourceReceipts" => "receiptId",
  "rootDefinitions" => "rootId",
  "rootStates" => "rootId",
  "dagNodes" => "nodeId",
  "dagEdges" => "edgeId"
}.freeze

$checks = []
$errors = []

class NoDuplicateHash < Hash
  def []=(key, value)
    raise JSON::ParserError, "duplicate key #{key}" if key?(key)
    super
  end
end

def record_check(condition, code, detail = nil)
  passed = !!condition
  $checks << { "code" => code, "passed" => passed }
  $errors << (detail ? "#{code}: #{detail}" : code) unless passed
end

def sha256(value)
  Digest::SHA256.hexdigest(value)
end

def canonical(value)
  case value
  when NilClass, TrueClass, FalseClass, Integer, String
    JSON.generate(value)
  when Array
    "[" + value.map { |entry| canonical(entry) }.join(",") + "]"
  when Hash
    "{" + value.keys.sort.map { |key| canonical(key) + ":" + canonical(value[key]) }.join(",") + "}"
  else
    raise "unsupported canonical value #{value.class}"
  end
end

def domain_root(domain, value)
  sha256(("CONNECT-D02-A8:" + domain + ":" + canonical(value)).encode("UTF-8"))
end

def find_repo_root(start)
  cursor = File.realpath(start)
  loop do
    return cursor if File.exist?(File.join(cursor, ".git")) && File.directory?(File.join(cursor, "web", "docs"))
    parent = File.dirname(cursor)
    raise "repository root not found" if parent == cursor
    cursor = parent
  end
end

def resolve_logical(repo_root, logical_path)
  unless logical_path.is_a?(String) && logical_path.start_with?("docs/") &&
         !logical_path.include?("\\") && !logical_path.include?("\0") &&
         Pathname.new(logical_path).cleanpath.to_s == logical_path
    raise "invalid logical path #{logical_path.inspect}"
  end
  namespace_root = File.realpath(File.join(repo_root, "web"))
  physical = File.realpath(File.join(namespace_root, logical_path))
  raise "logical path escape" unless physical.start_with?(namespace_root + File::SEPARATOR)
  physical
end

def read_json(repo_root, logical_path)
  bytes = File.binread(resolve_logical(repo_root, logical_path))
  text = bytes.dup.force_encoding(Encoding::UTF_8)
  raise "invalid UTF-8 #{logical_path}" unless text.valid_encoding?
  value = JSON.parse(text, :max_nesting => false, :object_class => NoDuplicateHash)
  [bytes, value]
end

def extent(bytes)
  text = bytes.dup.force_encoding(Encoding::UTF_8)
  {
    "sha256" => sha256(bytes),
    "lines" => bytes.count("\n"),
    "words" => text.strip.empty? ? 0 : text.strip.split(/\s+/).length,
    "bytes" => bytes.bytesize
  }
end

def expected_ids(prefix, count)
  (1..count).map { |number| prefix + number.to_s.rjust(3, "0") }
end

def same(left, right)
  canonical(left) == canonical(right)
end

def graph_status(graph)
  ids = graph["nodes"].map { |node| node["nodeId"] }
  id_set = ids.to_set
  dangling = graph["edges"].count { |edge| !id_set.include?(edge["from"]) || !id_set.include?(edge["to"]) }
  colors = ids.each_with_object({}) { |id, memo| memo[id] = :white }
  adjacency = ids.each_with_object({}) { |id, memo| memo[id] = [] }
  graph["edges"].each do |edge|
    adjacency[edge["from"]] << edge["to"] if id_set.include?(edge["from"]) && id_set.include?(edge["to"])
  end
  cycle = false
  visit = lambda do |id|
    if colors[id] == :gray
      cycle = true
      next
    end
    next if colors[id] == :black
    colors[id] = :gray
    adjacency[id].sort.each { |child| visit.call(child) }
    colors[id] = :black
  end
  ids.sort.each { |id| visit.call(id) if colors[id] == :white }
  { "dangling" => dangling, "cycles" => cycle ? 1 : 0 }
end

def deep_copy(value)
  JSON.parse(JSON.generate(value))
end

def locate(state, collection, target_id)
  array = if collection == "dagNodes"
    state["dag"]["nodes"]
  elsif collection == "dagEdges"
    state["dag"]["edges"]
  else
    state["registry"][collection]
  end
  id_field = ID_FIELDS.fetch(collection)
  [array, array.index { |item| item[id_field] == target_id }]
end

def apply_mutation(base_registry, base_dag, vector)
  state = { "registry" => deep_copy(base_registry), "dag" => deep_copy(base_dag) }
  collection = vector["targetCollection"]
  operation = vector["operation"]
  params = vector["params"] || {}
  if ["promptPolicy", "safeState", "modelSelectionAuthority"].include?(collection)
    state["registry"][collection][params["field"]] = params["value"]
    return state
  end
  if operation == "ADD_EDGE"
    state["dag"]["edges"] << {
      "edgeId" => vector["targetId"],
      "from" => params["from"],
      "to" => params["to"],
      "edgeType" => params["edgeType"]
    }
    return state
  end
  array, index = locate(state, collection, vector["targetId"])
  raise "mutation target absent #{vector['vectorId']}" unless index
  member = array[index]
  case operation
  when "DELETE_MEMBER", "DELETE_NODE"
    array.delete_at(index)
  when "SWAP_WITH_NEXT"
    raise "swap has no next member" if index + 1 >= array.length
    array[index], array[index + 1] = array[index + 1], array[index]
  when "FLIP_LAST_SHA_HEX"
    member["sha256"] = member["sha256"][0...-1] + (member["sha256"].end_with?("0") ? "1" : "0")
  when "FLIP_SHA_FIELD"
    field = params["field"]
    member[field] = member[field][0...-1] + (member[field].end_with?("0") ? "1" : "0")
  when "SET_FIELD"
    member[params["field"]] = params["value"]
  when "MUTATE_SEMANTIC_KEY_ONE_BYTE"
    member["semanticKey"] += "X"
  when "MUTATE_CLAIM_ONE_BYTE"
    member["claimCodes"][0] += "X"
  when "CROSS_SATISFY"
    other = state["registry"]["accountChildren"].find { |entry| entry["childId"] != member["childId"] }
    member["sourceAuthority"] = other["sourceAuthority"]
    member["issuerClass"] = other["issuerClass"]
  when "ADD_UNROOTED_CONJUNCT"
    member["orderedDependencyIds"] << params["dependency"]
  when "SUBSTITUTE_PUBLIC_EVIDENCE"
    member["orderedDependencyIds"] = params["dependencies"]
  else
    raise "unknown mutation operation #{operation}"
  end
  state
end

def first_structural_terminal(registry, dag, baseline, physical_inputs)
  return "INPUT-DENOMINATOR-INVALID" unless registry["frozenInputs"].length == 13
  registry["frozenInputs"].each do |input|
    actual = physical_inputs[input["inputId"]]
    return "INPUT-ROOT-MISMATCH" unless actual &&
      input["sha256"] == actual["sha256"] && input["lines"] == actual["lines"] &&
      input["bytes"] == actual["bytes"]
  end
  safe = registry["safeState"]
  return "SAFE-STATE-INVALID" unless safe["aiRuntime"] == "OFF" && safe["gate29"] == "BLOCKED" &&
    safe["developmentFreeze"] == "ACTIVE" && safe["repositoryVisibility"] == "PUBLIC"
  authority_ids = expected_ids("D02A8-AUTH-", 6)
  return "AUTHORITY-CHAIN-INVALID" unless same(registry["authorityChain"].map { |entry| entry["nodeId"] }, authority_ids)
  registry["authorityChain"].each_with_index do |entry, index|
    predecessor = index.zero? ? nil : authority_ids[index - 1]
    return "AUTHORITY-CHAIN-INVALID" unless entry["sequence"] == index + 1 && entry["predecessorId"] == predecessor
  end
  universe_ids = expected_ids("D02A8-PCU-", 6)
  return "PREDECESSOR-CLAUSE-DISPOSITION-INVALID" unless same(
    registry["predecessorClauseUniverses"].map { |entry| entry["universeId"] }, universe_ids
  )
  registry["predecessorClauseUniverses"].each_with_index do |universe, index|
    return "PREDECESSOR-CLAUSE-DISPOSITION-INVALID" unless
      universe["nodeId"] == authority_ids[index] && universe["inputId"] == expected_ids("D02A8-IN-", 6)[index]
    derived_members = if universe["derivationMode"] == "EXPLICIT-D02-LOCATORS"
      universe["memberLocators"]
    elsif universe["derivationMode"] == "NUMBERED-CLAUSE-REGEX-WHOLE-DOCUMENT"
      input_text = physical_inputs.dig(universe["inputId"], "text")
      return "PREDECESSOR-CLAUSE-DISPOSITION-INVALID" unless input_text.is_a?(String)
      input_text.lines.map { |line| line.match(/^([0-9]+(?:\.[0-9]+)+) /)&.[](1) }.compact
    else
      return "PREDECESSOR-CLAUSE-DISPOSITION-INVALID"
    end
    override_ids = universe["overrideDispositions"].map { |entry| entry["memberId"] }
    return "PREDECESSOR-CLAUSE-DISPOSITION-INVALID" unless
      derived_members.length == universe["expectedMemberCount"] &&
      derived_members.uniq.length == derived_members.length &&
      override_ids.uniq.length == override_ids.length &&
      override_ids.all? { |member_id| derived_members.include?(member_id) }
  end
  return "PREDECESSOR-CLAUSE-DISPOSITION-INVALID" unless same(
    registry["predecessorClauseUniverses"], baseline["predecessorClauseUniverses"]
  )
  msa = registry["modelSelectionAuthority"]
  return "MODEL-SELECTION-AUTHORITY-INVALID" unless msa["state"] == "MISSING" &&
    msa["acceptedSelection"].nil? && msa["issuedAt"].nil? && msa["expiresAt"].nil? && msa["revocationRoot"].nil?
  return "APPROVAL-DENOMINATOR-INVALID" unless same(
    registry["approvalRegistry"].map { |entry| entry["approvalId"] }, expected_ids("D02A8-APR-", 6)
  )
  return "A6-FINDING-DENOMINATOR-INVALID" unless same(
    registry["a6FindingRegistry"].map { |entry| entry["findingId"] }, expected_ids("D02-A6-IHR-F", 5)
  )
  return "A7-FINDING-DENOMINATOR-INVALID" unless same(
    registry["a7FindingRegistry"].map { |entry| entry["findingId"] }, expected_ids("D02-A7-IHR-F", 7)
  )
  all_findings = registry["a6FindingRegistry"] + registry["a7FindingRegistry"]
  return "FINDING-NO-MERGE-VIOLATION" if all_findings.any? { |entry| entry["noMergeKey"] != entry["findingId"] }
  return "AI-PROFILE-DENOMINATOR-INVALID" unless same(
    registry["aiProfileMembers"].map { |entry| entry["memberId"] }, expected_ids("D02A8-AIP-", 17)
  )
  return "AI-PROFILE-MEMBER-MUTATED" unless same(registry["aiProfileMembers"], baseline["aiProfileMembers"])
  prompt = registry["promptPolicy"]
  return "PROVIDER-PROMPT-FORBIDDEN" unless prompt["providerReusablePromptObjects"] == false &&
    prompt["responsesPromptObjectField"] == "FORBIDDEN"
  return "PROMPT-OWNERSHIP-INVALID" unless prompt["owner"] == "CONNECT" &&
    prompt["contentMode"] == "APPLICATION-OWNED-EXACT-BYTES"
  return "ACCOUNT-DENOMINATOR-INVALID" unless same(
    registry["accountParentRows"].map { |entry| entry["rowId"] }, expected_ids("D02A8-AR-", 9)
  )
  return "ACCOUNT-CHILD-DENOMINATOR-INVALID" unless same(
    registry["accountChildren"].map { |entry| entry["childId"] }, ["D02A8-AR-006-P", "D02A8-AR-006-F"]
  )
  return "ACCOUNT-CHILD-STALE" if registry["accountChildren"].any? { |entry| entry["state"] != "ABSENT" }
  return "ACCOUNT-CHILD-AUTHORITY-MISMATCH" unless same(registry["accountChildren"], baseline["accountChildren"])
  return "LEGAL-DENOMINATOR-INVALID" unless same(
    registry["legalPrivacyMembers"].map { |entry| entry["memberId"] }, expected_ids("D02A8-LP-", 7)
  )
  return "SOURCE-DENOMINATOR-INVALID" unless same(
    registry["officialSourceReceipts"].map { |entry| entry["receiptId"] }, expected_ids("D02A8-SRC-", 11)
  )
  registry["officialSourceReceipts"].each_with_index do |source, index|
    original = baseline["officialSourceReceipts"][index]
    return "SOURCE-STALE" if source["state"] == "STALE"
    return "SOURCE-ACCEPTANCE-INVALID" if source["accepted"] == true && source["acceptanceRoot"].nil?
    return "SOURCE-CHANGED" unless same(source["claimCodes"], original["claimCodes"])
    commitment_material = {
      "sourceId" => source["sourceId"],
      "url" => source["url"],
      "publisherAuthority" => source["publisherAuthority"],
      "retrievedAt" => source["retrievedAt"],
      "claimCodes" => source["claimCodes"]
    }
    return "SOURCE-COMMITMENT-INVALID" unless source["observationCommitment"] ==
      domain_root("SOURCE-CLAIM-COMMITMENT", commitment_material)
  end
  public_root = registry["rootDefinitions"].find { |entry| entry["rootId"] == "D02A8-ROOT-PUBLIC-DIRECTIVE" }
  return "PUBLIC-AUTHORITY-INVALID" unless public_root &&
    same(public_root["orderedDependencyIds"], ["D02A8-IN-013", "D18-A2:1.1.4"])
  return "DAG-NODE-DENOMINATOR-INVALID" unless same(
    dag["nodes"].map { |node| node["nodeId"] }, expected_ids("D02A8-DAG-N", 22)
  )
  graph = graph_status(dag)
  return "DAG-DANGLING-REFERENCE" unless graph["dangling"].zero?
  return "DAG-CYCLE" unless graph["cycles"].zero?
  dag["nodes"].each do |node|
    original = baseline["dag"]["nodes"].find { |entry| entry["nodeId"] == node["nodeId"] }
    return "ROOT-CLASS-MISMATCH" unless original && node["nodeClass"] == original["nodeClass"]
  end
  classes = {
    "D02A8-ROOT-PLANNING-ACCEPTANCE" => "D02-PLANNING-CONTRACT-ACCEPTANCE",
    "D02A8-ROOT-AI-ADMISSION" => "AI-PROFILE-ADMISSION",
    "D02A8-ROOT-RUNTIME-PERMIT" => "AI-RUNTIME-PERMIT"
  }
  return "ROOT-CLASS-MISMATCH" if registry["rootStates"].any? { |entry| classes[entry["rootId"]] != entry["rootClass"] }
  "PROFILE-NOT-ADMITTED"
end

report = {
  "artifactId" => "CONNECT-D02-A8-READER-B-REPORT-2026-08-30",
  "artifactClass" => "DETACHED-READ-ONLY-MECHANICAL-REPORT-NOT-ACCEPTANCE",
  "readerId" => READER_ID,
  "implementationLanguage" => "Ruby",
  "algorithmFamily" => "sorted-hash-canonicalization-plus-depth-first-dag",
  "readOnly" => true,
  "oracleRead" => false,
  "rootInstancesRead" => false,
  "expectedToActualCount" => 0,
  "inputFiles" => [],
  "packageCoreRoot" => nil,
  "roots" => {},
  "counters" => {},
  "graph" => {},
  "mutations" => {},
  "checks" => {},
  "safeState" => {},
  "currentTerminal" => "READER-FAILED",
  "mechanicalVerdict" => "FAIL",
  "semanticAcceptance" => 0,
  "errors" => []
}

begin
  repo_root = find_repo_root(Dir.pwd)
  loaded = {}
  LOGICAL.each do |name, logical_path|
    bytes, value = read_json(repo_root, logical_path)
    loaded[name] = { "bytes" => bytes, "value" => value }
    report["inputFiles"] << { "logicalPath" => logical_path }.merge(extent(bytes))
    record_check(true, "JSON-NATIVE-DUPLICATE-KEY-GUARD-" + File.basename(logical_path))
  end
  schema = loaded["schema"]["value"]
  registry = loaded["registry"]["value"]
  dag = loaded["dag"]["value"]
  corpus = loaded["corpus"]["value"]
  record_check(schema["$id"] == "urn:connect:d02:a8:normative-registry-schema:2026-08-30", "SCHEMA-ID")
  record_check(registry.keys.sort == EXPECTED_TOP_LEVEL, "REGISTRY-TOP-LEVEL-CLOSED")
  record_check(registry["schemaVersion"] == "D02-A8-SCHEMA-1", "REGISTRY-SCHEMA-VERSION")
  record_check(registry.dig("canonicalization", "algorithm") == "RFC8785-JCS-SHA256", "CANONICALIZATION-PROFILE")
  physical_inputs = {}
  registry["frozenInputs"].each do |input|
    bytes = File.binread(resolve_logical(repo_root, input["path"]))
    physical_inputs[input["inputId"]] = extent(bytes).merge("text" => bytes.dup.force_encoding(Encoding::UTF_8))
  end
  baseline = registry.merge("dag" => dag)
  record_check(first_structural_terminal(registry, dag, baseline, physical_inputs) == "PROFILE-NOT-ADMITTED", "BASELINE-STRUCTURAL-CONFORMANCE")
  base_graph = graph_status(dag)
  record_check(base_graph["dangling"].zero?, "DAG-NO-DANGLING")
  record_check(base_graph["cycles"].zero?, "DAG-ACYCLIC")
  record_check(corpus["oracleReadByReaders"] == false && corpus["expectedToActualFlow"] == "PROHIBITED", "NO-EXPECTED-TO-ACTUAL")
  record_check(corpus["vectors"].length == corpus["vectorCount"] && corpus["vectorCount"] == 179, "MUTATION-DENOMINATOR")
  file_members = report["inputFiles"].map do |entry|
    { "logicalPath" => entry["logicalPath"], "sha256" => entry["sha256"], "bytes" => entry["bytes"] }
  end
  report["packageCoreRoot"] = domain_root("PACKAGE-CORE", file_members)
  report["roots"] = {
    "frozenInputManifestRoot" => domain_root("FROZEN-INPUT-MANIFEST", registry["frozenInputs"]),
    "authorityChainRoot" => domain_root("AUTHORITY-CHAIN", registry["authorityChain"]),
    "predecessorClauseDispositionRoot" => domain_root("PREDECESSOR-CLAUSE-DISPOSITION", registry["predecessorClauseUniverses"]),
    "publicDirectiveRoot" => domain_root("PUBLIC-DIRECTIVE", {
      "input" => registry["frozenInputs"].find { |entry| entry["inputId"] == "D02A8-IN-013" },
      "definition" => registry["rootDefinitions"].find { |entry| entry["rootId"] == "D02A8-ROOT-PUBLIC-DIRECTIVE" }
    }),
    "modelSelectionAuthorityRoot" => domain_root("MODEL-SELECTION-AUTHORITY", registry["modelSelectionAuthority"]),
    "promptPolicyRoot" => domain_root("PROMPT-POLICY", registry["promptPolicy"]),
    "aiProfileRegistryRoot" => domain_root("AI-PROFILE-REGISTRY", registry["aiProfileMembers"]),
    "accountRegistryRoot" => domain_root("ACCOUNT-REGISTRY", {
      "parents" => registry["accountParentRows"], "children" => registry["accountChildren"]
    }),
    "legalPrivacyRegistryRoot" => domain_root("LEGAL-PRIVACY-REGISTRY", registry["legalPrivacyMembers"]),
    "officialSourceObservationRoot" => domain_root("OFFICIAL-SOURCE-OBSERVATION", registry["officialSourceReceipts"]),
    "approvalRegistryRoot" => domain_root("APPROVAL-REGISTRY", registry["approvalRegistry"]),
    "a6FindingCarryRoot" => domain_root("A6-FINDING-CARRY", registry["a6FindingRegistry"]),
    "a7FindingClosureCandidateRoot" => domain_root("A7-FINDING-CLOSURE-CANDIDATE", registry["a7FindingRegistry"]),
    "rootDefinitionRoot" => domain_root("ROOT-DEFINITIONS", registry["rootDefinitions"]),
    "crossProgramDagRoot" => domain_root("CROSS-PROGRAM-DAG", dag)
  }
  results = []
  terminal_counts = Hash.new(0)
  corpus["vectors"].each do |vector|
    mutated = apply_mutation(registry, dag, vector)
    terminal = first_structural_terminal(mutated["registry"], mutated["dag"], baseline, physical_inputs)
    results << { "vectorId" => vector["vectorId"], "actualTerminal" => terminal }
    terminal_counts[terminal] += 1
  end
  record_check(results.all? { |entry| entry["actualTerminal"] != "PROFILE-NOT-ADMITTED" }, "ALL-MUTATIONS-KILLED")
  report["counters"] = {
    "frozenInputs" => registry["frozenInputs"].length,
    "authorityNodes" => registry["authorityChain"].length,
    "predecessorClauseUniverses" => registry["predecessorClauseUniverses"].length,
    "predecessorClauseMembers" => registry["predecessorClauseUniverses"].sum { |entry| entry["expectedMemberCount"] },
    "approvals" => registry["approvalRegistry"].length,
    "a6Findings" => registry["a6FindingRegistry"].length,
    "a7Findings" => registry["a7FindingRegistry"].length,
    "aiProfileMembers" => registry["aiProfileMembers"].length,
    "accountParents" => registry["accountParentRows"].length,
    "accountChildren" => registry["accountChildren"].length,
    "legalPrivacyMembers" => registry["legalPrivacyMembers"].length,
    "officialSources" => registry["officialSourceReceipts"].length,
    "acceptedOfficialSources" => registry["officialSourceReceipts"].count { |entry| entry["accepted"] },
    "planningAcceptance" => 0,
    "aiAdmission" => 0,
    "runtimePermit" => 0
  }
  report["graph"] = {
    "nodes" => dag["nodes"].length,
    "edges" => dag["edges"].length,
    "cycleCount" => base_graph["cycles"],
    "danglingReferenceCount" => base_graph["dangling"]
  }
  report["mutations"] = {
    "vectorCount" => corpus["vectorCount"],
    "evaluatedCount" => results.length,
    "killedCount" => results.count { |entry| entry["actualTerminal"] != "PROFILE-NOT-ADMITTED" },
    "terminalCounts" => terminal_counts,
    "results" => results
  }
  report["safeState"] = registry["safeState"]
  report["currentTerminal"] = "PROFILE-NOT-ADMITTED"
rescue => error
  $errors << "#{error.class}: #{error.message}\n#{error.backtrace.join("\n")}"
end

report["checks"] = {
  "passed" => $checks.count { |entry| entry["passed"] },
  "failed" => $checks.count { |entry| !entry["passed"] },
  "records" => $checks
}
report["errors"] = $errors
report["mechanicalVerdict"] = $errors.empty? && report.dig("checks", "failed").zero? ? "PASS" : "FAIL"
STDOUT.write(JSON.pretty_generate(report) + "\n")
