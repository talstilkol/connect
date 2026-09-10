#!/usr/bin/env ruby

require "digest"
require "json"
require "open3"
require "pathname"
require "set"
require "unicode_normalize/normalize"

READER_ID = "PRCV4-READER-B-RUBY".freeze
EXPECTED_REPOSITORY = "github.com/talstilkol/connect".freeze
MANIFEST_PATH = "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-atomic-package-manifest-2026-08-30.json".freeze
MEMBER_PATHS = [
  ["subject", "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-2026-08-30.md"],
  ["registries", "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-schema-and-typed-registries-2026-08-30.json"],
  ["graph", "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-producer-dependency-graph-2026-08-30.json"],
  ["vectors", "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-operation-oracle-vector-pack-2026-08-30.json"],
  ["closures", "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-finding-closure-registry-2026-08-30.json"],
  ["readerA", "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-reader-a-2026-08-30.mjs"],
  ["readerB", "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-reader-b-2026-08-30.rb"]
].freeze

$checks = []
$errors = []

class DuplicateKeyHash < Hash
  def []=(key, value)
    raise JSON::ParserError, "duplicate key #{key}" if key?(key)
    super
  end
end

def check(condition, code, detail = nil)
  passed = !!condition
  $checks << { "code" => code, "passed" => passed }
  $errors << (detail ? "#{code}: #{detail}" : code) unless passed
  passed
end

def run_git(arguments, cwd)
  stdout, stderr, status = Open3.capture3("git", *arguments, :chdir => cwd)
  raise "git #{arguments.join(' ')} failed: #{stderr.strip}" unless status.success?
  stdout.strip
end

def normalize_origin(raw)
  value = raw.strip
  match = value.match(%r{\Ahttps://github\.com/([^/]+)/([^/]+?)(?:\.git)?\z}i)
  match ||= value.match(%r{\Agit@github\.com:([^/]+)/([^/]+?)(?:\.git)?\z}i)
  match ? "github.com/#{match[1]}/#{match[2]}".downcase : nil
end

def discover_repository_root
  discovered = run_git(["rev-parse", "--show-toplevel"], Dir.pwd)
  real_root = File.realpath(discovered)
  cwd_real = File.realpath(Dir.pwd)
  check(cwd_real == real_root || cwd_real.start_with?(real_root + File::SEPARATOR), "ROOT-CWD-WITHIN-DISCOVERED", cwd_real)
  check(discovered == real_root, "ROOT-REALPATH-CANONICAL", "#{discovered} != #{real_root}")
  origin = run_git(["remote", "get-url", "origin"], real_root)
  check(normalize_origin(origin) == EXPECTED_REPOSITORY, "ROOT-ORIGIN-IDENTITY", origin)
  real_root
end

def validate_planning_path(relative_path)
  raise "path is not a string" unless relative_path.is_a?(String)
  raise "non-NFC path: #{relative_path}" unless relative_path.unicode_normalized?(:nfc)
  raise "wrong planning prefix: #{relative_path}" unless relative_path.start_with?("docs/planning/")
  raise "forbidden path byte: #{relative_path}" if relative_path.include?("\0") || relative_path.include?("\\")
  pathname = Pathname.new(relative_path)
  raise "absolute path: #{relative_path}" if pathname.absolute?
  raise "non-canonical path: #{relative_path}" unless pathname.cleanpath.to_s == relative_path
  segments = relative_path.split("/")
  raise "forbidden path segment: #{relative_path}" if segments.any? { |segment| segment.empty? || segment == "." || segment == ".." }
end

def resolve_planning_file(repo_root, relative_path)
  validate_planning_path(relative_path)
  lexical = File.expand_path(relative_path, repo_root)
  raise "lexical escape: #{relative_path}" unless lexical.start_with?(repo_root + File::SEPARATOR)
  real = File.realpath(lexical)
  raise "symlink escape: #{relative_path}" unless real.start_with?(repo_root + File::SEPARATOR)
  real
end

def validate_json_value(value, label, trail = "$")
  case value
  when String
    raise "#{label}: non-NFC string at #{trail}" unless value.unicode_normalized?(:nfc)
  when Integer
    raise "#{label}: unsafe integer at #{trail}" if value < -9_007_199_254_740_991 || value > 9_007_199_254_740_991
  when Float
    raise "#{label}: floating-point value forbidden at #{trail}"
  when Array
    value.each_with_index { |entry, index| validate_json_value(entry, label, "#{trail}[#{index}]") }
  when Hash
    value.each do |key, entry|
      raise "#{label}: non-NFC key at #{trail}" unless key.unicode_normalized?(:nfc)
      validate_json_value(entry, label, "#{trail}.#{key}")
    end
  end
end

def read_json(repo_root, relative_path)
  bytes = File.binread(resolve_planning_file(repo_root, relative_path))
  text = bytes.dup.force_encoding(Encoding::UTF_8)
  raise "#{relative_path}: invalid UTF-8" unless text.valid_encoding?
  value = JSON.parse(text, :max_nesting => false, :object_class => DuplicateKeyHash)
  validate_json_value(value, relative_path)
  [bytes, value]
end

def sha256(bytes)
  Digest::SHA256.hexdigest(bytes)
end

def file_record(repo_root, relative_path)
  bytes = File.binread(resolve_planning_file(repo_root, relative_path))
  {
    "path" => relative_path,
    "sha256" => sha256(bytes),
    "lines" => bytes.count("\n"),
    "bytes" => bytes.bytesize
  }
end

def domain_root(domain, members)
  material = members.map { |member|
    "#{member['path']}\0#{member['sha256']}\0#{member['bytes']}\n"
  }.join
  Digest::SHA256.hexdigest("CONNECT-PRCV4:#{domain}:".b + material.b)
end

def suffix(index)
  index.to_s.rjust(3, "0")
end

def collect_keys(value, output = [])
  case value
  when Array
    value.each { |entry| collect_keys(entry, output) }
  when Hash
    value.each do |key, entry|
      output << key
      collect_keys(entry, output)
    end
  end
  output
end

report = {
  "artifactId" => "CONNECT-PRCV4-READER-B-REPORT-2026-08-30",
  "artifactClass" => "MECHANICAL-READER-RECEIPT-NOT-SEMANTIC-ACCEPTANCE",
  "readerId" => READER_ID,
  "implementationLanguage" => "Ruby",
  "algorithmFamily" => "native-json-plus-depth-first-dag",
  "repositoryVisibility" => "PUBLIC",
  "manifestPath" => MANIFEST_PATH,
  "manifestSha256" => nil,
  "coreRoot" => nil,
  "packageRoot" => nil,
  "counts" => {},
  "checks" => { "passed" => 0, "failed" => 0, "failedCodes" => [] },
  "mechanicalVerdict" => "FAIL",
  "semanticAcceptance" => 0,
  "gate29" => "BLOCKED",
  "developmentFreeze" => "ACTIVE",
  "publicPushPermit" => "ABSENT",
  "controlPlanePermit" => "ABSENT",
  "deploymentPermit" => "ABSENT",
  "releasePermit" => "ABSENT",
  "errors" => []
}

begin
  repo_root = discover_repository_root
  subject_path = MEMBER_PATHS[0][1]
  registry_path = MEMBER_PATHS[1][1]
  graph_path = MEMBER_PATHS[2][1]
  vector_path = MEMBER_PATHS[3][1]
  closure_path = MEMBER_PATHS[4][1]
  _registry_bytes, registry = read_json(repo_root, registry_path)
  _graph_bytes, graph = read_json(repo_root, graph_path)
  _vector_bytes, vectors = read_json(repo_root, vector_path)
  _closure_bytes, closures = read_json(repo_root, closure_path)
  manifest_bytes, manifest = read_json(repo_root, MANIFEST_PATH)
  subject = File.binread(resolve_planning_file(repo_root, subject_path)).force_encoding(Encoding::UTF_8)

  report["manifestSha256"] = sha256(manifest_bytes)
  report["coreRoot"] = manifest["coreRoot"]
  report["packageRoot"] = manifest["packageRoot"]

  check(registry.dig("repositoryBinding", "logicalId") == EXPECTED_REPOSITORY, "REGISTRY-REPOSITORY-BINDING")
  check(registry["repositoryVisibility"] == "PUBLIC", "REGISTRY-PUBLIC")
  check(registry.dig("canonicalProfile", "profileId") == "PRCV4-CJ-1", "REGISTRY-CANONICAL-PROFILE")
  check(registry["artifactDomains"].to_set.length == registry["artifactDomains"].length, "REGISTRY-DOMAINS-UNIQUE")
  check(["CORE-PACKAGE-ROOT", "PACKAGE-ROOT", "MANIFEST-ENVELOPE", "READER-REPORT"].all? { |id|
    registry["artifactDomains"].include?(id)
  }, "REGISTRY-DOMAINS-COMPLETE")

  check(registry["physicalInputs"].length == 15, "INPUT-PHYSICAL-DENOMINATOR")
  input_ids = Set.new
  actual_physical_inputs = []
  registry["physicalInputs"].each do |input|
    input_ids.add(input["inputId"])
    actual = file_record(repo_root, input["path"])
    actual_physical_inputs << {
      "inputId" => input["inputId"],
      "path" => actual["path"],
      "sha256" => actual["sha256"],
      "lines" => actual["lines"],
      "bytes" => actual["bytes"],
      "claimClass" => input["claimClass"]
    }
    check(
      actual["sha256"] == input["sha256"] && actual["lines"] == input["lines"] && actual["bytes"] == input["bytes"],
      "INPUT-BYTES-#{input['inputId']}"
    )
  end
  check(input_ids.length == 15, "INPUT-PHYSICAL-UNIQUE")
  check(registry["typedAbsentInputs"].length == 10, "INPUT-ABSENT-DENOMINATOR")
  check(registry["typedAbsentInputs"].map { |entry| entry["inputId"] }.to_set.length == 10, "INPUT-ABSENT-UNIQUE")
  check(registry["typedAbsentInputs"].all? { |entry|
    entry["state"] == "ABSENT" && entry.keys.none? { |key| key.match?(/path|locator|digest|sha/i) }
  }, "INPUT-ABSENCE-TYPED-NO-LOCATOR")
  check(
    manifest["physicalInputMembers"] == actual_physical_inputs &&
      manifest["physicalInputRoot"] == domain_root("INPUT-MANIFEST", actual_physical_inputs) &&
      manifest["typedAbsentInputIds"] == registry["typedAbsentInputs"].map { |entry| entry["inputId"] },
    "MANIFEST-PHYSICAL-AND-ABSENT-INPUT-BINDING"
  )

  requirements = registry["requirementDefinitions"]
  producers = registry["producerDefinitions"]
  states = registry["plannedOutputStates"]
  check(requirements.length == 42 && producers.length == 42 && states.length == 42, "REQUIREMENT-PRODUCER-STATE-DENOMINATORS")
  req_by_id = requirements.each_with_object({}) { |entry, memo| memo[entry["requirementId"]] = entry }
  check(req_by_id.length == 42, "REQUIREMENT-IDS-UNIQUE")
  check(requirements.each_with_index.all? { |entry, index| entry["requirementId"] == "PRCV4-REQ-#{suffix(index)}" }, "REQUIREMENT-IDS-CONTIGUOUS")
  check(requirements.each_with_index.all? { |entry, index|
    entry["dependencies"].all? { |dependency| dependency[-3, 3].to_i < index }
  }, "REQUIREMENT-DEPENDENCIES-TOPOLOGICAL")
  check(requirements.all? { |entry|
    schema = entry["outputSchema"]
    schema.is_a?(Hash) &&
      schema["additionalProperties"] == false &&
      schema["required"].is_a?(Hash) &&
      !schema["required"].empty? &&
      schema["invariants"].is_a?(Array) &&
      !schema["invariants"].empty? &&
      entry["failure"].is_a?(String)
  }, "REQUIREMENT-SCHEMAS-CLOSED-NONVACUOUS")
  critical_control_fields = {
    "PRCV4-REQ-002" => ["planningPathGrammar", "repositoryPathGrammar", "gitTopLevelRealPathCommitment", "originIdentity"],
    "PRCV4-REQ-005" => ["trustedTimeAuthorityRoot", "maximumTtls", "atomicConsumeRule", "descendantRevocationRule"],
    "PRCV4-REQ-011" => ["head", "refs", "indexEntries", "worktreeEntries", "writerBarrierReceipt", "preHead", "postHead"],
    "PRCV4-REQ-012" => ["cutStart", "cutEnd", "refs", "reachableObjectRoot", "forkRecords", "unreachableCapability", "inaccessibleRecords"],
    "PRCV4-REQ-013" => ["surfaceDefinitions", "surfaceInstances", "paginationRoot", "retentionRoot", "inaccessibleRoot"],
    "PRCV4-REQ-014" => ["entryRecords", "ownerAuthorityRoot", "deletionAuthorityRoot", "preservationRoot"],
    "PRCV4-REQ-015" => ["generatedRecords", "buildContexts", "legacyTaintRecords", "symlinkEscapeState"],
    "PRCV4-REQ-018" => ["privateLedgerCommitment", "candidateCount", "stateCounts", "rotationReceipts", "residualCopyRecords"],
    "PRCV4-REQ-019" => ["scannerRecords", "identicalInputCutRoot", "detectorCorpusRoot", "executionReceipts", "disagreementRecords", "combinedOutcome"],
    "PRCV4-REQ-022" => ["cacheRecords", "artifactRecords", "runnerRecords", "purgeRoot"],
    "PRCV4-REQ-025" => ["permitRoot", "issuerRoot", "executorRoot", "readerRoot", "beforeRoot", "orderedOperations", "consumeReceipt", "afterRoot", "readbackRoot"],
    "PRCV4-REQ-027" => ["baseRef", "expectedOldOid", "newCommitOid", "entryRecords", "sentObjectRoot", "builderARoot", "builderBRoot", "adjudicatorRoot", "allowlistRoot"],
    "PRCV4-REQ-028" => ["requiredVisibility", "issueReadbackRoot", "consumeReadbackRoot", "monitorReceiptRoot", "maximumFreshnessSeconds", "descendantRevocationRoot"],
    "PRCV4-REQ-029" => ["permitRoot", "refName", "expectedOldOid", "newOid", "sentObjectRoot", "allowlistRoot", "issuedAt", "expiresAt", "consumeReceipt", "remoteReceipt", "postReadbackRoot"],
    "PRCV4-REQ-031" => ["permitRoot", "artifactRoot", "targetRoot", "planRoot", "consumeReceipt", "applyReceipt", "driftRoot", "recoveryRoot"],
    "PRCV4-REQ-032" => ["permitRoot", "commitOid", "tagRef", "releaseRoot", "assetRoots", "packageCoordinates", "consumeReceipt", "consumerVerificationRoot"]
  }
  check(critical_control_fields.all? { |requirement_id, fields|
    fields.all? { |field| req_by_id[requirement_id].dig("outputSchema", "required").key?(field) }
  }, "CRITICAL-CONTROL-FIELD-BINDINGS")
  check(requirements.map { |entry| entry["outputObjectId"] }.to_set.length == 42, "OUTPUT-OBJECTS-UNIQUE")
  check(requirements.map { |entry| entry["soleProducerId"] }.to_set.length == 42, "SOLE-PRODUCERS-UNIQUE")
  check(producers.each_with_index.all? { |producer, index|
    requirement = requirements[index]
    producer["producerId"] == requirement["soleProducerId"] &&
      producer["outputObjectId"] == requirement["outputObjectId"] &&
      producer["inputObjectIds"] == requirement["dependencies"].map { |id| "PRCV4-OBJECT-#{id[-3, 3]}" } &&
      producer["bootstrapAuthorityObjectId"] == (index >= 4 ? "PRCV4-OBJECT-003" : nil) &&
      producer["implementationRoot"].nil? &&
      producer["signerRoot"].nil? &&
      producer["capabilityRoot"].nil? &&
      producer["implementationState"] == "ABSENT" &&
      producer["acceptanceCredit"] == 0
  }, "SOLE-PRODUCER-AUTHORITY-ABSENT")
  check(states.each_with_index.all? { |state, index|
    requirement = requirements[index]
    state["objectId"] == requirement["outputObjectId"] &&
      state["outputType"] == requirement["outputType"] &&
      state["schemaRequirementId"] == requirement["requirementId"] &&
      state["producerId"] == requirement["soleProducerId"] &&
      state["dependencyObjectIds"] == requirement["dependencies"].map { |id| "PRCV4-OBJECT-#{id[-3, 3]}" } &&
      state["state"] == "DECLARED-UNIMPLEMENTED" &&
      state["head"].nil? &&
      state["epoch"].nil? &&
      state["expiresAt"].nil? &&
      state["evidenceRoots"].empty? &&
      state["acceptanceCredit"] == 0
  }, "PLANNED-OUTPUT-STATES-NONACCEPTED")
  check(requirements[40]["dependencies"] == requirements[0, 40].map { |entry| entry["requirementId"] }, "ACCEPTANCE-EXACT-PRIOR-CUT")
  check(requirements[41]["dependencies"] == requirements[0, 41].map { |entry| entry["requirementId"] }, "FINAL-EXACT-PRIOR-CUT")

  check(graph["nodes"].length == 109 && graph["edges"].length == 619, "GRAPH-DENOMINATORS")
  node_ids = graph["nodes"].map { |node| node["nodeId"] }.to_set
  edge_ids = graph["edges"].map { |edge| edge["edgeId"] }.to_set
  check(node_ids.length == 109 && edge_ids.length == 619, "GRAPH-IDENTITIES-UNIQUE")
  check(graph["edges"].all? { |edge| node_ids.include?(edge["from"]) && node_ids.include?(edge["to"]) }, "GRAPH-ENDPOINTS-CLOSED")
  adjacency = Hash.new { |hash, key| hash[key] = [] }
  graph["edges"].each { |edge| adjacency[edge["from"]] << edge["to"] }
  colors = {}
  cycle = false
  visit = lambda do |node|
    if colors[node] == :visiting
      cycle = true
      next
    end
    next if colors[node] == :done
    colors[node] = :visiting
    adjacency[node].each { |child| visit.call(child) }
    colors[node] = :done
  end
  node_ids.each { |node| visit.call(node) }
  check(!cycle && colors.length == node_ids.length, "GRAPH-DAG-DEPTH-FIRST")
  check(requirements.all? { |requirement|
    graph["edges"].any? { |edge|
      edge["from"] == requirement["soleProducerId"] &&
        edge["to"] == requirement["outputObjectId"] &&
        edge["edgeType"] == "PRODUCES"
    }
  }, "GRAPH-SOLE-PRODUCER-EDGES")
  check(requirements.all? { |requirement|
    requirement["dependencies"].all? { |dependency|
      graph["edges"].any? { |edge|
        edge["from"] == "PRCV4-OBJECT-#{dependency[-3, 3]}" &&
          edge["to"] == requirement["soleProducerId"] &&
          edge["edgeType"] == "OBJECT-CONSUMED-BY"
      }
    }
  }, "GRAPH-DEPENDENCY-EDGES")

  check(closures["records"].length == 93 && closures["aliasRecords"].length == 32, "CLOSURE-DENOMINATORS")
  check(closures["records"].map { |entry| entry["findingId"] }.to_set.length == 93, "CLOSURE-FINDINGS-UNIQUE")
  check(closures["records"].map { |entry| entry["noMergeKey"] }.to_set.length == 93, "CLOSURE-NOMERGE-UNIQUE")
  check(closures["records"].map { |entry| entry["vectorId"] }.to_set.length == 93, "CLOSURE-VECTORS-UNIQUE")
  severity_counts = ["P0", "P1", "P2", "P3"].map { |severity|
    closures["records"].count { |entry| entry["severity"] == severity }
  }
  check(severity_counts == [54, 38, 1, 0], "CLOSURE-SEVERITY-EXACT")
  source_counts = Hash.new(0)
  closures["records"].each { |entry| source_counts[entry["sourceFindingRoot"]] += 1 }
  check(source_counts["a84a26bd0439e4da5bed5a941b8956e041268fc33ba40e2d89d095b55dec51e4"] == 32, "CLOSURE-PREDECESSOR-ROOT-COUNT")
  check(source_counts["f049b4b681d1c03bed1b4856a61a064383faa3b3bab58a2baca85bf546f81c16"] == 27, "CLOSURE-V2-ROOT-COUNT")
  check(source_counts["52d5b987ae710d6946c7f1f495493b6af2a852405fd0ecc295b0037899c79e4b"] == 34, "CLOSURE-V3-ROOT-COUNT")
  check(closures["records"].all? { |entry|
    !entry["requirementIds"].empty? &&
      entry["requirementIds"].all? { |id| req_by_id.key?(id) && id[-3, 3].to_i < 38 } &&
      entry["requirementRootStates"].map { |state| state["requirementId"] } == entry["requirementIds"] &&
      entry["requirementRootStates"].all? { |state| state["acceptedRoot"].nil? && state["state"] == "ABSENT" } &&
      entry["vectorExecutionReceiptRoot"].nil? &&
      entry["operationalEvidenceRoots"].empty? &&
      entry["independentDispositionRoot"].nil? &&
      entry["accepted"] == false &&
      entry["acceptanceCredit"] == 0
  }, "CLOSURE-ROOT-LIFECYCLE-NONACCEPTED")
  check(closures["aliasRecords"].all? { |entry|
    entry["predecessorRoot"] == "a84a26bd0439e4da5bed5a941b8956e041268fc33ba40e2d89d095b55dec51e4" &&
      entry["wrapperRoot"] == "f049b4b681d1c03bed1b4856a61a064383faa3b3bab58a2baca85bf546f81c16" &&
      entry["fieldEquivalenceRoot"].nil? &&
      entry["equivalenceState"] == "UNPROVED" &&
      entry["acceptanceCredit"] == 0
  }, "ALIAS-32-UNPROVED-ZERO-CREDIT")
  closure_edge_keys = graph["edges"].select { |edge|
    edge["edgeType"] == "FINDING-CLOSURE-REQUIRES-ACCEPTED-ROOT"
  }.map { |edge| "#{edge['findingId']}|#{edge['from']}|#{edge['to']}" }.to_set
  expected_closure_edge_keys = closures["records"].flat_map { |entry|
    entry["requirementIds"].map { |requirement_id|
      "#{entry['findingId']}|PRCV4-OBJECT-#{requirement_id[-3, 3]}|PRCV4-PRODUCER-038"
    }
  }.to_set
  check(
    closure_edge_keys.length == 204 &&
      expected_closure_edge_keys.length == 204 &&
      closure_edge_keys == expected_closure_edge_keys,
    "GRAPH-CLOSURE-ROOT-EDGES-EXACT"
  )

  check(vectors["vectors"].length == 93, "VECTOR-DENOMINATOR")
  check(vectors["vectors"].map { |entry| entry["vectorId"] }.to_set.length == 93, "VECTOR-IDS-UNIQUE")
  check(vectors["vectors"].map { |entry| entry["findingId"] }.to_set.length == 93, "VECTOR-FINDINGS-UNIQUE")
  operations = vectors["operationDefinitions"].each_with_object({}) { |entry, memo| memo[entry["operationId"]] = entry }
  oracles = vectors["oracleDefinitions"].map { |entry| entry["oracleId"] }.to_set
  check(operations.length == 7 && oracles.length == 2, "VECTOR-OPERATION-ORACLE-DENOMINATORS")
  check(vectors["vectors"].map { |entry| entry.dig("operation", "kind") }.to_set.length == 7, "VECTOR-ALL-OPERATIONS-NONVACUOUS")
  closure_by_vector = closures["records"].each_with_object({}) { |entry, memo| memo[entry["vectorId"]] = entry }
  check(vectors["vectors"].all? { |vector|
    requirement = req_by_id[vector["targetRequirementId"]]
    closure = closure_by_vector[vector["vectorId"]]
    definition = operations[vector.dig("operation", "operationId")]
    requirement &&
      closure &&
      closure["findingId"] == vector["findingId"] &&
      closure["noMergeKey"] == vector["noMergeKey"] &&
      closure["requirementIds"].include?(vector["targetRequirementId"]) &&
      vector["targetObjectId"] == requirement["outputObjectId"] &&
      vector["targetOutputType"] == requirement["outputType"] &&
      vector["targetSchemaRequirementId"] == requirement["requirementId"] &&
      requirement.dig("outputSchema", "required").key?(vector.dig("operation", "fieldPath")) &&
      requirement.dig("outputSchema", "required", vector.dig("operation", "fieldPath")) == vector.dig("operation", "fieldType") &&
      definition &&
      definition["kind"] == vector.dig("operation", "kind") &&
      definition["terminalSource"] == "TARGET-EVALUATOR" &&
      oracles.include?(vector.dig("oracle", "oracleId")) &&
      vector.dig("oracle", "targetEvaluatorRequirementId") == requirement["requirementId"] &&
      vector.dig("oracle", "terminalSource") == "TARGET-REQUIREMENT-FAILURE-NOT-VECTOR" &&
      vector["expectedTerminal"] == requirement["failure"] &&
      vector["evaluatorImplementationRoot"].nil? &&
      vector["executionReceiptRoot"].nil? &&
      vector["executionState"] == "SPECIFIED-UNIMPLEMENTED" &&
      vector["acceptanceCredit"] == 0
  }, "VECTOR-CAUSAL-SCHEMA-TERMINAL-LINKAGE")
  check(collect_keys(vectors).none? { |key| key.start_with?("control_") }, "VECTOR-NO-CONTROL-CHANNEL")

  check(manifest["members"].length == 7, "MANIFEST-MEMBER-DENOMINATOR")
  check(manifest["members"].map { |entry| [entry["role"], entry["path"]] } == MEMBER_PATHS, "MANIFEST-MEMBER-ORDER-AND-PATHS")
  actual_members = MEMBER_PATHS.map { |_role, member_path| file_record(repo_root, member_path) }
  check(manifest["members"].each_with_index.all? { |entry, index|
    entry["sha256"] == actual_members[index]["sha256"] &&
      entry["lines"] == actual_members[index]["lines"] &&
      entry["bytes"] == actual_members[index]["bytes"]
  }, "MANIFEST-MEMBER-BYTES")
  calculated_core_root = domain_root("CORE-PACKAGE-ROOT", actual_members[0, 5])
  calculated_package_root = domain_root("PACKAGE-ROOT", actual_members)
  check(manifest["coreRoot"] == calculated_core_root, "MANIFEST-CORE-ROOT")
  check(manifest["packageRoot"] == calculated_package_root, "MANIFEST-PACKAGE-ROOT")
  check(
    manifest.dig("rootAlgorithms", "core", "domain") == "CORE-PACKAGE-ROOT" &&
      manifest.dig("rootAlgorithms", "package", "domain") == "PACKAGE-ROOT",
    "MANIFEST-DOMAIN-SEPARATION"
  )
  check(manifest["reportsExcludedFromRoots"] == true && manifest["manifestExcludedFromPackageRoot"] == true, "MANIFEST-NO-SELF-HASH-CYCLE")
  check(
    [
      manifest.dig("denominators", "members"),
      manifest.dig("denominators", "semanticCoreMembers"),
      manifest.dig("denominators", "physicalInputs"),
      manifest.dig("denominators", "typedAbsentInputs"),
      manifest.dig("denominators", "requirements"),
      manifest.dig("denominators", "producers"),
      manifest.dig("denominators", "outputStates"),
      manifest.dig("denominators", "graphNodes"),
      manifest.dig("denominators", "graphEdges"),
      manifest.dig("denominators", "closureEdges"),
      manifest.dig("denominators", "findings"),
      manifest.dig("denominators", "inheritedFindings"),
      manifest.dig("denominators", "newFindings"),
      manifest.dig("denominators", "aliases"),
      manifest.dig("denominators", "vectors")
    ] == [7, 5, 15, 10, 42, 42, 42, 109, 619, 204, 93, 59, 34, 32, 93],
    "MANIFEST-DENOMINATORS-EXACT"
  )

  disposition = registry["currentDisposition"]
  check(
    registry.dig("currentObservedState", "secretCandidateCoordinates") == 6 &&
      registry.dig("currentObservedState", "clearedSecretCandidates") == 0 &&
      req_by_id["PRCV4-REQ-019"]["dependencies"].include?("PRCV4-REQ-018") &&
      req_by_id["PRCV4-REQ-019"].dig("outputSchema", "invariants").include?("exactly two independent scanner roots minimum"),
    "SECRET-CANDIDATE-TWO-SCANNER-BLOCKING-STATE"
  )
  check(
    disposition["repositoryVisibility"] == "PUBLIC" &&
      disposition["acceptance"] == 0 &&
      disposition["gate29"] == "BLOCKED" &&
      disposition["developmentFreeze"] == "ACTIVE" &&
      disposition["controlPlanePermit"] == "ABSENT" &&
      disposition["publicPushPermit"] == "ABSENT" &&
      disposition["deploymentPermit"] == "ABSENT" &&
      disposition["releasePermit"] == "ABSENT",
    "CURRENT-DISPOSITION-FAIL-CLOSED-PUBLIC"
  )
  check(
    closures.dig("currentDisposition", "acceptance") == 0 &&
      closures.dig("currentDisposition", "gate29") == "BLOCKED" &&
      closures.dig("currentDisposition", "repositoryVisibility") == "PUBLIC",
    "CLOSURE-DISPOSITION-FAIL-CLOSED"
  )
  check(
    manifest.dig("currentDisposition", "acceptance") == 0 &&
      manifest.dig("currentDisposition", "gate29") == "BLOCKED" &&
      manifest.dig("currentDisposition", "repositoryVisibility") == "PUBLIC",
    "MANIFEST-DISPOSITION-FAIL-CLOSED"
  )
  check(
    subject.include?("repository visibility=PUBLIC") &&
      subject.include?("Gate29=BLOCKED") &&
      subject.include?("development freeze=ACTIVE"),
    "SUBJECT-PUBLIC-BLOCKED-INVARIANT"
  )
  package_source = MEMBER_PATHS.map { |_role, member_path|
    File.binread(resolve_planning_file(repo_root, member_path)).force_encoding(Encoding::UTF_8)
  }.join("\n")
  banned_fragments = [["Math", "random"].join("."), ["random", "UUID"].join]
  check(banned_fragments.none? { |fragment| package_source.include?(fragment) }, "PACKAGE-NO-RANDOMNESS-API")

  report["counts"] = {
    "physicalInputs" => 15,
    "typedAbsentInputs" => 10,
    "requirements" => 42,
    "producers" => 42,
    "outputStates" => 42,
    "graphNodes" => 109,
    "graphEdges" => 619,
    "closureEdges" => 204,
    "findings" => 93,
    "inheritedFindings" => 59,
    "newFindings" => 34,
    "aliases" => 32,
    "vectors" => 93,
    "acceptedRequirements" => 0,
    "acceptedClosures" => 0,
    "operationalEvidenceRoots" => 0
  }
rescue StandardError => error
  $errors << "READER-EXCEPTION: #{error.message}"
end

report["checks"] = {
  "passed" => $checks.count { |entry| entry["passed"] },
  "failed" => $checks.count { |entry| !entry["passed"] },
  "failedCodes" => $checks.reject { |entry| entry["passed"] }.map { |entry| entry["code"] }
}
report["errors"] = $errors
report["mechanicalVerdict"] = $errors.empty? ? "PASS" : "FAIL"
STDOUT.write(JSON.pretty_generate(report) + "\n")
exit(1) unless $errors.empty?
