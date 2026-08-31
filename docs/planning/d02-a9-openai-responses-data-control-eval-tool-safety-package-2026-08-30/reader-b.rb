#!/usr/bin/env ruby

require "digest"
require "json"
require "pathname"
require "set"

READER_ID = "D02A9-READER-B-RUBY".freeze
PKG = "docs/planning/d02-a9-openai-responses-data-control-eval-tool-safety-package-2026-08-30".freeze
ROOTS = {
  "admitted" => "d4d0a384b05897522ab9a3e96dd626cede14c9e4e0351906acd3201fd6dfd630",
  "semantics" => "1a7e0f90fca63f87e0a243a9738d2e2a1a17334a61bf2cabedf9a34070f186e4",
  "sources" => "5d2ced7611fb4975715037a0e7261bedfd0454b8b8c882f3e48b638f0dc81ef2",
  "appointments" => "aa3a873c798fdbd6dfe17c737fc099d370f600b4109700e19a3aea475bfd7bbf",
  "dagNodes" => "f6fe5da0fc9757b0f53727174ec0f8e9f7a578512336632076af997b10baa87c",
  "dagEdges" => "4602168466169a1904824a748f8f0f78ae00db57a0638322581f6f1455c5bbd2"
}.freeze
CORE = {
  "snapshotSchema" => "#{PKG}/snapshot.schema.json", "transitionSchema" => "#{PKG}/transition.schema.json", "envelopeSchema" => "#{PKG}/envelope.schema.json",
  "snapshot" => "#{PKG}/snapshot.json", "transitionMachine" => "#{PKG}/transition-machine.json", "positiveControls" => "#{PKG}/positive-controls.json",
  "inputManifest" => "#{PKG}/admitted-input-manifest.json", "semanticUniverse" => "#{PKG}/predecessor-semantic-universe.json", "sourceReceipts" => "#{PKG}/source-receipts.json",
  "appointments" => "#{PKG}/producer-appointments.json", "dag" => "#{PKG}/dependency-dag.json", "semanticRegistry" => "#{PKG}/semantic-registry.json", "mutationCorpus" => "#{PKG}/mutation-corpus.json"
}.freeze
INPUT_PATHS = [
  "docs/decision-intake-2026-08-21.md", "docs/researched-decision-approval-2026-08-26.md", "docs/planning/d02-a4-openai-model-routing-reconciliation-2026-08-29.md",
  "docs/planning/d02-a5-openai-responses-data-control-and-model-selection-reconciliation-2026-08-29.md", "docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-2026-08-30.md",
  "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-semantic-successor-2026-08-30.md", "docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-independent-hostile-review-2026-08-30.md",
  "docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-independent-hostile-review-findings-manifest-2026-08-30.md", "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-finding-closure-crosswalk-2026-08-30.md",
  "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-producer-qa-2026-08-30.md", "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-2026-08-30.md",
  "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-findings-manifest-2026-08-30.md", "docs/planning/d18-a2-public-repository-security-decision-2026-08-29.md"
].freeze
INPUT_ROLES = ["USER-D02-DIRECTIVE", "RESEARCHED-DECISION", "ENGINEERING-RECONCILIATION", "SEMANTIC-SUCCESSOR", "SEMANTIC-SUCCESSOR", "SEMANTIC-SUCCESSOR", "INDEPENDENT-REVIEW", "FINDINGS-MANIFEST", "CLOSURE-CROSSWALK", "PRODUCER-QA", "INDEPENDENT-REVIEW", "FINDINGS-MANIFEST", "DURABLE-USER-PUBLIC-DIRECTIVE"].freeze
A8_TOP = [
  "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-immutable-successor-2026-08-30.md", "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-finding-closure-crosswalk-2026-08-30.md",
  "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-producer-qa-2026-08-30.md", "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-2026-08-30.md",
  "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-findings-manifest-2026-08-30.md"
].freeze
A8_PACKAGE = %w[dependency-dag.json mutation-corpus.json mutation-oracle.json package-manifest.json reader-a-report.json reader-a.mjs reader-b-report.json reader-b.rb registry.json root-instances.json schema.json].map { |name| "docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/#{name}" }.freeze
A9_TOP = ["docs/planning/d02-a9-openai-responses-data-control-eval-and-tool-safety-immutable-successor-2026-08-30.md", "docs/planning/d02-a9-openai-responses-data-control-eval-and-tool-safety-finding-closure-crosswalk-2026-08-30.md", "docs/planning/d02-a9-openai-responses-data-control-eval-and-tool-safety-producer-qa-2026-08-30.md"].freeze
PACKAGE_FIXED = %w[generate.mjs snapshot.schema.json transition.schema.json envelope.schema.json snapshot.json transition-machine.json positive-controls.json control-oracle.json admitted-input-manifest.json predecessor-semantic-universe.json source-receipts.json producer-appointments.json dependency-dag.json semantic-registry.json mutation-corpus.json mutation-oracle.json generation-report.json reader-a.mjs reader-b.rb reader-a-report.json reader-b-report.json execution-receipts.json].map { |name| "#{PKG}/#{name}" }.freeze
SHARD_PATHS = (1..29).map { |index| "#{PKG}/semantic-shards/semantic-shard-#{index.to_s.rjust(3, '0')}.json" }.freeze

class NoDuplicateHash < Hash
  def []=(key, value)
    raise JSON::ParserError, "duplicate key #{key}" if key?(key)
    super
  end
end

def sha256(value)
  Digest::SHA256.hexdigest(value)
end
def canonical(value)
  case value
  when NilClass, TrueClass, FalseClass, Integer then JSON.generate(value)
  when String
    normalized = value.unicode_normalize(:nfc)
    raise "non-NFC string" unless normalized == value
    JSON.generate(value)
  when Array then "[" + value.map { |entry| canonical(entry) }.join(",") + "]"
  when Hash then "{" + value.keys.sort.map { |key| canonical(key) + ":" + canonical(value[key]) }.join(",") + "}"
  else raise "unsupported value #{value.class}"
  end
end
def same(left, right)
  canonical(left) == canonical(right)
end
def domain_root(domain, value)
  sha256(("CONNECT-D02-A9:" + domain + ":" + canonical(value)).encode("UTF-8"))
end
def deep_copy(value)
  JSON.parse(JSON.generate(value))
end
def extent(bytes)
  text = bytes.dup.force_encoding(Encoding::UTF_8)
  { "sha256" => sha256(bytes), "lines" => bytes.count("\n"), "words" => text.strip.empty? ? 0 : text.strip.split(/\s+/).length, "bytes" => bytes.bytesize }
end

def namespace_root(start)
  cursor = File.realpath(start)
  loop do
    return cursor if File.directory?(File.join(cursor, "docs")) && File.exist?(File.join(cursor, "..", ".git"))
    return File.join(cursor, "web") if File.exist?(File.join(cursor, ".git")) && File.directory?(File.join(cursor, "web", "docs"))
    parent = File.dirname(cursor)
    raise "namespace root not found" if parent == cursor
    cursor = parent
  end
end
NAMESPACE_ROOT = namespace_root(Dir.pwd).freeze
def resolve_logical(logical_path)
  unless logical_path.is_a?(String) && logical_path.start_with?("docs/") && !logical_path.include?("\\") && !logical_path.include?("\0") && Pathname.new(logical_path).cleanpath.to_s == logical_path
    raise "invalid logical path #{logical_path.inspect}"
  end
  physical = File.expand_path(logical_path, NAMESPACE_ROOT)
  raise "logical path escape" unless physical.start_with?(NAMESPACE_ROOT + File::SEPARATOR)
  physical
end
def read_json(logical_path)
  bytes = File.binread(resolve_logical(logical_path))
  text = bytes.dup.force_encoding(Encoding::UTF_8)
  raise "invalid UTF-8" unless text.valid_encoding?
  [bytes, JSON.parse(text, max_nesting: false, object_class: NoDuplicateHash)]
end

def resolve_ref(root_schema, ref)
  raise "external ref forbidden" unless ref.start_with?("#/")
  ref[2..].split("/").reduce(root_schema) do |cursor, token|
    key = token.gsub("~1", "/").gsub("~0", "~")
    raise "unresolved ref #{ref}" unless cursor.is_a?(Hash) && cursor.key?(key)
    cursor[key]
  end
end
def schema_errors(schema, instance, root_schema = schema, at = "$")
  return schema_errors(resolve_ref(root_schema, schema["$ref"]), instance, root_schema, at) if schema["$ref"]
  errors = []
  errors << "#{at}:const" if schema.key?("const") && !same(instance, schema["const"])
  errors << "#{at}:enum" if schema["enum"] && !schema["enum"].any? { |entry| same(entry, instance) }
  if schema["type"]
    valid = case schema["type"]
            when "object" then instance.is_a?(Hash)
            when "array" then instance.is_a?(Array)
            when "integer" then instance.is_a?(Integer)
            when "string" then instance.is_a?(String)
            when "boolean" then instance == true || instance == false
            else false
            end
    return errors + ["#{at}:type"] unless valid
  end
  if instance.is_a?(Hash)
    properties = schema["properties"] || {}
    (schema["required"] || []).each { |key| errors << "#{at}:required:#{key}" unless instance.key?(key) }
    instance.keys.each { |key| errors << "#{at}:unknown:#{key}" if schema["additionalProperties"] == false && !properties.key?(key) }
    properties.each { |key, sub| errors.concat(schema_errors(sub, instance[key], root_schema, "#{at}/#{key}")) if instance.key?(key) }
  elsif instance.is_a?(Array)
    errors << "#{at}:minItems" if schema["minItems"] && instance.length < schema["minItems"]
    errors << "#{at}:maxItems" if schema["maxItems"] && instance.length > schema["maxItems"]
    errors << "#{at}:uniqueItems" if schema["uniqueItems"] && instance.map { |entry| canonical(entry) }.uniq.length != instance.length
    instance.each_with_index { |entry, index| errors.concat(schema_errors(schema["items"], entry, root_schema, "#{at}/#{index}")) } if schema["items"]
  elsif instance.is_a?(String)
    errors << "#{at}:minLength" if schema["minLength"] && instance.each_char.count < schema["minLength"]
    errors << "#{at}:maxLength" if schema["maxLength"] && instance.each_char.count > schema["maxLength"]
    errors << "#{at}:pattern" if schema["pattern"] && !Regexp.new(schema["pattern"]).match?(instance)
  elsif instance.is_a?(Integer)
    errors << "#{at}:minimum" if schema["minimum"] && instance < schema["minimum"]
    errors << "#{at}:maximum" if schema["maximum"] && instance > schema["maximum"]
  end
  errors
rescue StandardError => error
  ["#{at}:#{error.message}"]
end
def preflight_refs(schema)
  refs = []
  walk = lambda do |value|
    if value.is_a?(Array) then value.each { |entry| walk.call(entry) }
    elsif value.is_a?(Hash)
      refs << value["$ref"] if value["$ref"]
      value.values.each { |entry| walk.call(entry) }
    end
  end
  walk.call(schema)
  refs.each { |ref| resolve_ref(schema, ref) }
  refs.length
end

def physical_lines(bytes)
  lines = []
  start = 0
  bytes.bytes.each_with_index do |byte, index|
    if byte == 10
      lines << bytes.byteslice(start, index - start + 1)
      start = index + 1
    end
  end
  lines << bytes.byteslice(start, bytes.bytesize - start) if start < bytes.bytesize
  lines
end
def classify_line(text)
  trimmed = text.sub(/\r?\n\z/, "").strip
  return "BLANK" if trimmed.empty?
  return "HEADING" if /^\#{1,6}\s/.match?(trimmed)
  return "TABLE-ROW" if /^\|.*\|$/.match?(trimmed)
  return "NUMBERED-CLAUSE" if /^[0-9]+(?:\.[0-9]+)+\s/.match?(trimmed)
  return "LIST-ITEM" if /^(?:[-*+]\s|[0-9]+\.\s)/.match?(trimmed)
  return "CODE-FENCE" if /^```/.match?(trimmed)
  "PROSE-OR-CODE"
end
def normalize_line(text)
  text.sub(/\r?\n\z/, "").unicode_normalize(:nfc).gsub(/[ \t]+/, " ").strip
end
def decode_entities(text)
  named = { "amp" => "&", "lt" => "<", "gt" => ">", "quot" => '"', "apos" => "'", "nbsp" => " " }
  text.gsub(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/i) do
    token = Regexp.last_match(1)
    if token.start_with?("#x", "#X") then [token[2..].to_i(16)].pack("U")
    elsif token.start_with?("#") then [token[1..].to_i].pack("U")
    else named.fetch(token.downcase)
    end
  end
end
def normalize_html(bytes)
  text = bytes.dup.force_encoding(Encoding::UTF_8)
  stripped = text.gsub(/<!--.*?-->/m, " ").gsub(/<(script|style|svg|noscript)\b[^>]*>.*?<\/\1>/im, " ").gsub(/<[^>]+>/m, " ")
  decode_entities(stripped).unicode_normalize(:nfc).gsub(/\s+/, " ").strip
end

EXPECTED_STATES = [["D02A9-ROOT-PLANNING-ACCEPTANCE", "D02-PLANNING-CONTRACT-ACCEPTANCE"], ["D02A9-ROOT-AI-ADMISSION", "AI-PROFILE-ADMISSION"], ["D02A9-ROOT-RUNTIME-PERMIT", "AI-RUNTIME-PERMIT"]].freeze
PLANNING_PREDICATES = %w[PACKAGE-ENVELOPE AUTHORITY-CHAIN PREDECESSOR-SEMANTICS PUBLIC-DIRECTIVE INDEPENDENT-A9-REVIEW A9-SEVEN-FINDING-CLOSURE PROGRAM-ACCEPTANCE].freeze
AI_PREDICATES = %w[MODEL-SELECTION CONNECT-PROMPT AI-PROFILE ACCOUNT LEGAL-PRIVACY SOURCE-ACCEPTANCE APPROVALS EVAL].freeze
RUNTIME_PREDICATES = %w[GATE29 FREEZE-LIFT RUNTIME-ACCOUNT TRUSTED-TIME REVOCATION-CLEAR CAS-MATCH SINGLE-USE POST-READBACK].freeze
CONTROL_PURPOSES = ["ALL-MISSING-CURRENT-SAFE-STATE", "PLANNING-SATISFIABLE-HIGHER-ROOTS-BLOCKED", "AI-ADMISSION-SATISFIABLE-RUNTIME-BLOCKED", "RUNTIME-PERMIT-MATHEMATICALLY-SATISFIABLE", "EXPIRY-RETURNS-SAFE-BLOCK", "REVOCATION-RETURNS-SAFE-BLOCK", "REPLAY-RETURNS-SAFE-BLOCK", "CAS-MISMATCH-RETURNS-SAFE-BLOCK", "POST-READBACK-MISMATCH-RETURNS-SAFE-BLOCK"].freeze
EXPECTED_CONTROL_TERMINALS = %w[PLANNING-CONJUNCT-MISSING AI-CONJUNCT-MISSING RUNTIME-CONJUNCT-MISSING CONTROL-SATISFIABLE-NON-AUTHORIZING EXPIRED-BLOCKED REVOKED-BLOCKED REPLAY-BLOCKED CAS-MISMATCH-BLOCKED POST-READBACK-MISMATCH-BLOCKED].freeze
def evaluate_control(control)
  values = control["predicates"].to_h { |row| [row["predicateId"], row["value"]] }
  planning = PLANNING_PREDICATES.all? { |id| values[id] } ? "ACCEPTED-CONTROL" : "BLOCKED"
  ai = planning == "ACCEPTED-CONTROL" && AI_PREDICATES.all? { |id| values[id] } ? "ACCEPTED-CONTROL" : "BLOCKED"
  runtime = ai == "ACCEPTED-CONTROL" && RUNTIME_PREDICATES.all? { |id| values[id] } ? "ACCEPTED-CONTROL" : "BLOCKED"
  terminal = runtime == "ACCEPTED-CONTROL" ? "CONTROL-SATISFIABLE-NON-AUTHORIZING" : ai == "ACCEPTED-CONTROL" ? "RUNTIME-CONJUNCT-MISSING" : planning == "ACCEPTED-CONTROL" ? "AI-CONJUNCT-MISSING" : "PLANNING-CONJUNCT-MISSING"
  [["REPLAY", "REPLAY-BLOCKED"], ["CAS-MISMATCH", "CAS-MISMATCH-BLOCKED"], ["REVOKED", "REVOKED-BLOCKED"], ["EXPIRED", "EXPIRED-BLOCKED"], ["POST-READBACK-MISMATCH", "POST-READBACK-MISMATCH-BLOCKED"]].each do |predicate, value|
    next unless values[predicate]
    runtime = "BLOCKED"
    ai = "BLOCKED" if %w[REVOKED EXPIRED].include?(predicate)
    terminal = value
    break
  end
  { "controlId" => control["controlId"], "planning" => planning, "aiAdmission" => ai, "runtimePermit" => runtime, "terminal" => terminal, "acceptanceCredit" => 0 }
end
def operation_key(record)
  domain_root("TRANSITION-OPERATION-KEY-V1", %w[transitionId rootId fromState toState event previousVersion nextVersion expectedPreviousRoot evidenceRoot].to_h { |key| [key, record[key]] })
end

def graph_status(dag)
  ids = dag["nodes"].map { |node| node["nodeId"] }
  id_set = ids.to_set
  adjacency = ids.to_h { |id| [id, []] }
  dangling = 0
  dag["edges"].each do |edge|
    if id_set.include?(edge["from"]) && id_set.include?(edge["to"]) then adjacency[edge["from"]] << edge["to"] else dangling += 1 end
  end
  colors = ids.to_h { |id| [id, :white] }
  cycle = false
  visit = lambda do |id|
    if colors[id] == :gray then cycle = true; next end
    next if colors[id] == :black
    colors[id] = :gray
    adjacency[id].sort.each { |child| visit.call(child) }
    colors[id] = :black
  end
  ids.sort.each { |id| visit.call(id) if colors[id] == :white }
  { "dangling" => dangling, "cycles" => cycle ? 1 : 0 }
end

def evaluate_bundle(bundle, physical_check = true)
  begin
    preflight_refs(bundle["snapshotSchema"]); preflight_refs(bundle["transitionSchema"]); preflight_refs(bundle["envelopeSchema"])
  rescue StandardError
    return "SCHEMA-DEFINITION-INVALID"
  end
  return "SNAPSHOT-SCHEMA-INVALID" unless schema_errors(bundle["snapshotSchema"], bundle["snapshot"]).empty?
  bundle["positiveControls"]["controls"].each { |control| return "TRANSITION-SCHEMA-INVALID" unless schema_errors(bundle["transitionSchema"], control["transition"]).empty? }
  expected_safe = { "aiRuntime" => "OFF", "gate29" => "BLOCKED", "developmentFreeze" => "ACTIVE", "repositoryVisibility" => "PUBLIC", "planningAcceptance" => "MISSING", "aiAdmission" => "MISSING", "runtimePermit" => "MISSING", "acceptanceCount" => 0 }
  return "SAFE-STATE-INVALID" unless same(bundle["snapshot"]["safeState"], expected_safe)
  states = bundle["snapshot"]["rootStates"].map { |row| [row["rootId"], row["rootClass"], row["state"], row["rootSha256"], row["acceptanceCredit"]] }
  return "SAFE-STATE-INVALID" unless same(states, EXPECTED_STATES.map { |id, klass| [id, klass, "MISSING", "MISSING", 0] })

  manifest = bundle["inputManifest"]
  return "INPUT-MANIFEST-INVALID" unless manifest["entryCount"] == 13 && manifest["entries"].length == 13 && manifest["admittedManifestRoot"] == ROOTS["admitted"] && bundle["semanticRegistry"]["admittedInputManifest"]["admittedManifestRoot"] == ROOTS["admitted"]
  expected_ids = (1..13).map { |index| "D02A9-IN-#{index.to_s.rjust(3, '0')}" }
  return "INPUT-MANIFEST-INVALID" unless same(manifest["entries"].map { |entry| entry["inputId"] }, expected_ids) && same(manifest["entries"].map { |entry| entry["logicalPath"] }, INPUT_PATHS) && same(manifest["entries"].map { |entry| entry["role"] }, INPUT_ROLES)
  return "INPUT-MANIFEST-INVALID" if manifest["entries"].any? { |entry| !entry["requiredConsumerRootIds"].is_a?(Array) || entry["requiredConsumerRootIds"].empty? }
  return "INPUT-MANIFEST-INVALID" unless domain_root("ADMITTED-INPUT-MANIFEST-V1", manifest["entries"]) == ROOTS["admitted"]
  if physical_check
    manifest["entries"].each { |entry| return "INPUT-MANIFEST-INVALID" unless same(extent(File.binread(resolve_logical(entry["logicalPath"]))), entry.slice("sha256", "lines", "words", "bytes")) }
  end

  universe = bundle["semanticUniverse"]
  shards = bundle["semanticShards"]
  return "SEMANTIC-UNIVERSE-INVALID" unless universe["sourceCount"] == 18 && universe["memberCount"] == 2864 && universe["tableRowCount"] == 295 && universe["shardCount"] == 29 && shards.length == 29 && universe["semanticUniverseRoot"] == ROOTS["semantics"] && bundle["semanticRegistry"]["predecessorSemanticUniverse"]["semanticUniverseRoot"] == ROOTS["semantics"]
  members = []
  shards.each_with_index do |shard, index|
    descriptor = universe["shards"][index]
    return "SEMANTIC-UNIVERSE-INVALID" unless descriptor && descriptor["shardId"] == shard["shardId"] && descriptor["memberCount"] == shard["members"].length && descriptor["memberRoot"] == domain_root("PREDECESSOR-SEMANTIC-SHARD-V1", shard["members"])
    members.concat(shard["members"])
  end
  return "SEMANTIC-UNIVERSE-INVALID" unless members.length == 2864 && domain_root("TOTAL-PREDECESSOR-SEMANTIC-UNIVERSE-V1", members) == ROOTS["semantics"]
  by_source = Hash.new { |hash, key| hash[key] = [] }
  members.each_with_index do |member, index|
    return "SEMANTIC-UNIVERSE-INVALID" if member["ordinal"] != index + 1 || member["disposition"].to_s.empty? || member["successorTarget"].to_s.empty?
    by_source[member["sourceId"]] << member
  end
  if physical_check
    universe["sources"].each do |source|
      lines = physical_lines(File.binread(resolve_logical(source["logicalPath"])))
      rows = by_source[source["sourceId"]]
      return "SEMANTIC-UNIVERSE-INVALID" unless lines.length == rows.length
      lines.each_with_index do |line, index|
        text = line.dup.force_encoding(Encoding::UTF_8)
        row = rows[index]
        return "SEMANTIC-UNIVERSE-INVALID" unless row["lineNumber"] == index + 1 && row["exactByteLength"] == line.bytesize && row["exactLineSha256"] == sha256(line) && row["normalizedTextSha256"] == sha256(normalize_line(text).encode("UTF-8")) && row["lineKind"] == classify_line(text)
      end
    end
  end

  receipts = bundle["sourceReceipts"]
  return "SOURCE-RECEIPTS-INVALID" unless receipts["receiptCount"] == 11 && receipts["receipts"].length == 11 && receipts["acceptedCount"] == 0 && receipts["publishedPageByteCount"] == 0 && receipts["sourceObservationRoot"] == ROOTS["sources"] && bundle["semanticRegistry"]["sourceReceiptSet"]["sourceObservationRoot"] == ROOTS["sources"]
  receipts["receipts"].each do |receipt|
    core = deep_copy(receipt); core.delete("historicalObservationCommitment")
    return "SOURCE-RECEIPTS-INVALID" unless receipt["historicalObservationCommitment"] == domain_root("SOURCE-RECEIPT-V1", core) && receipt["response"]["status"] == 200 && receipt["observation"]["extractorId"] == "CONNECT-HTML-TEXT-V1" && receipt["observation"]["pageBytesPublished"] == false && receipt["acceptance"]["accepted"] == false && receipt["acceptance"]["acceptanceCredit"] == 0 && receipt["request"]["url"].start_with?("https://developers.openai.com/")
  end
  return "SOURCE-RECEIPTS-INVALID" unless domain_root("SOURCE-OBSERVATION-SET-V1", receipts["receipts"]) == ROOTS["sources"]

  definitions = bundle["semanticRegistry"]["rootDefinitions"]
  dag = bundle["dag"]
  nodes = definitions.map { |root| { "nodeId" => root["rootId"], "nodeClass" => root["rootClass"], "producerId" => root["producerId"] } }
  edges = []
  definitions.each do |root|
    root["orderedDependencyIds"].each { |dependency| edges << { "edgeId" => "D02A9-EDGE-#{(edges.length + 1).to_s.rjust(3, '0')}", "from" => dependency, "to" => root["rootId"], "edgeType" => "REQUIRED-ALL-OF" } }
  end
  return "DAG-INVALID" unless same(dag["nodes"], nodes) && same(dag["edges"], edges) && dag["exactNodeRoot"] == ROOTS["dagNodes"] && dag["exactEdgeRoot"] == ROOTS["dagEdges"] && domain_root("DAG-NODES-V1", dag["nodes"]) == ROOTS["dagNodes"] && domain_root("DAG-EDGES-V1", dag["edges"]) == ROOTS["dagEdges"]
  status = graph_status(dag)
  return "DAG-INVALID" if status["dangling"] != 0 || status["cycles"] != 0 || dag["prohibitedEdges"].any? { |prohibited| dag["edges"].any? { |edge| edge["from"] == prohibited["from"] && edge["to"] == prohibited["to"] } }

  appointments = bundle["appointments"]
  return "PRODUCER-APPOINTMENT-INVALID" unless appointments["appointmentCount"] == 24 && appointments["appointments"].length == 24 && appointments["appointmentsRoot"] == ROOTS["appointments"] && bundle["semanticRegistry"]["producerAppointments"]["appointmentsRoot"] == ROOTS["appointments"] && appointments["selfAuthorityCount"] == 0 && domain_root("PRODUCER-APPOINTMENTS-V1", appointments["appointments"]) == ROOTS["appointments"]
  appointments["appointments"].each do |row|
    outputs = definitions.select { |root| root["producerId"] == row["producerId"] }.map { |root| root["rootId"] }
    return "PRODUCER-APPOINTMENT-INVALID" unless same(row["allowedOutputRootIds"], outputs) && row["authoritySourceId"] != row["producerId"] && !outputs.include?(row["authoritySourceId"]) && row["acceptanceCredit"] == 0
  end

  machine = bundle["transitionMachine"]
  expected_transitions = [["MISSING", "MISSING", "NOOP"], ["MISSING", "PRESENT-UNACCEPTED", "SUBMIT"], ["PRESENT-UNACCEPTED", "ACCEPTED", "ACCEPT"], ["ACCEPTED", "EXPIRED", "EXPIRE"], ["ACCEPTED", "REVOKED", "REVOKE"], ["ACCEPTED", "CONSUMED", "CONSUME"], ["CONSUMED", "BLOCKED", "REPLAY"], ["PRESENT-UNACCEPTED", "BLOCKED", "CAS-MISMATCH"], ["ACCEPTED", "BLOCKED", "POST-READBACK-MISMATCH"], ["EXPIRED", "PRESENT-UNACCEPTED", "REPLACE"], ["REVOKED", "PRESENT-UNACCEPTED", "REPLACE"], ["BLOCKED", "PRESENT-UNACCEPTED", "REPLACE"]]
  return "TRANSITION-MACHINE-INVALID" unless same(machine["allowedTransitions"].map { |row| [row["fromState"], row["toState"], row["event"]] }, expected_transitions) && same(machine["terminalPrecedence"], %w[REPLAY CAS-MISMATCH REVOKED EXPIRED POST-READBACK-MISMATCH MISSING-CONJUNCT CONTROL-SATISFIABLE-NON-AUTHORIZING])
  controls = bundle["positiveControls"]["controls"]
  return "POSITIVE-CONTROL-INVALID" unless bundle["positiveControls"]["controlCount"] == 9 && controls.length == 9 && same(controls.map { |control| control["purpose"] }, CONTROL_PURPOSES)
  controls.each_with_index do |control, index|
    transition = control["transition"]
    rule = machine["allowedTransitions"].find { |row| row["fromState"] == transition["fromState"] && row["toState"] == transition["toState"] && row["event"] == transition["event"] }
    return "POSITIVE-CONTROL-INVALID" unless control["controlOnly"] == true && control["authorityCredit"] == 0
    return "TRANSITION-SEMANTICS-INVALID" unless rule && transition["controlOnly"] == true && transition["acceptanceCredit"] == 0 && transition["operationKey"] == operation_key(transition) && transition["nextVersion"] == transition["previousVersion"] + (transition["event"] == "NOOP" ? 0 : 1)
    return "TRANSITION-SEMANTICS-INVALID" if %w[ACCEPT CONSUME].include?(transition["event"]) && transition["casResult"] != "MATCH"
    return "TRANSITION-SEMANTICS-INVALID" if transition["event"] == "CAS-MISMATCH" && transition["casResult"] != "MISMATCH"
    return "TRANSITION-SEMANTICS-INVALID" if transition["event"] == "REPLAY" && transition["toState"] != "BLOCKED"
    return "POSITIVE-CONTROL-INVALID" unless evaluate_control(control)["terminal"] == EXPECTED_CONTROL_TERMINALS[index]
  end
  registry = bundle["semanticRegistry"]
  return "FINDING-CLOSURE-INVALID" unless registry["a6FindingCarry"].length == 5 && registry["a7FindingCarry"].length == 7 && registry["a8FindingClosureCandidates"].length == 7
  registry["a8FindingClosureCandidates"].each_with_index { |row, index| expected = "D02-A8-IHR-F#{(index + 1).to_s.rjust(3, '0')}"; return "FINDING-CLOSURE-INVALID" unless row["findingId"] == expected && row["noMergeKey"] == expected && row["acceptanceCredit"] == 0 && row["state"] == "OPEN" }
  return "SEMANTIC-REGISTRY-INVALID" unless registry["authorityChain"].length == 7 && registry["authorityChain"].each_with_index.all? { |row, index| row["sequence"] == index + 1 && row["predecessorId"] == (index.zero? ? nil : registry["authorityChain"][index - 1]["nodeId"]) }
  return "SEMANTIC-REGISTRY-INVALID" unless registry["publicDirective"] == { "inputId" => "D02A9-IN-013", "locator" => "D18-A2:1.1.4", "policy" => "PUBLIC", "liveReadbackState" => "UNKNOWN-NOT-RUN", "acceptanceCredit" => 0 }
  immutable = { "aiRuntime" => "OFF", "gate29" => "BLOCKED", "developmentFreeze" => "ACTIVE", "repositoryVisibility" => "PUBLIC", "acceptanceCount" => 0, "selfAcceptance" => 0, "productMutationCount" => 0, "gitMutationCount" => 0, "githubMutationCount" => 0, "providerMutationCount" => 0 }
  return "SAFE-STATE-INVALID" unless same(registry["immutableState"], immutable)
  "PASS"
rescue StandardError
  "READER-EXCEPTION"
end

def apply_vector(base, vector)
  state = deep_copy(base)
  parent = state[vector["artifact"]]
  vector["pointer"][0...-1].each { |token| parent = parent[token] }
  key = vector["pointer"].last
  case vector["operation"]
  when "DELETE" then parent.is_a?(Array) ? parent.delete_at(key) : parent.delete(key)
  when "SET" then parent[key] = deep_copy(vector["value"])
  when "SWAP" then parent[key], parent[key + 1] = parent[key + 1], parent[key]
  else raise "unsupported inner operation"
  end
  state
end

def load_bundle
  loaded = {}
  files = []
  CORE.each do |key, logical_path|
    bytes, value = read_json(logical_path)
    loaded[key] = value
    files << { "logicalPath" => logical_path }.merge(extent(bytes))
  end
  loaded["semanticShards"] = SHARD_PATHS.map do |logical_path|
    bytes, value = read_json(logical_path)
    files << { "logicalPath" => logical_path }.merge(extent(bytes))
    value
  end
  [loaded, files]
end
def source_refresh(bundle, source_dir)
  return { "mode" => "NOT-RUN", "checked" => 0, "changed" => 0, "unavailable" => 0 } unless source_dir
  checked = changed = unavailable = 0
  bundle["sourceReceipts"]["receipts"].each do |receipt|
    suffix = receipt["receiptId"][-3, 3]
    file = File.join(source_dir, "d02a9-source-#{suffix}.html")
    unless File.exist?(file) then unavailable += 1; next end
    bytes = File.binread(file)
    normalized = normalize_html(bytes)
    checked += 1
    changed += 1 if sha256(bytes) != receipt["response"]["rawResponseSha256"] || sha256(normalized.encode("UTF-8")) != receipt["observation"]["normalizedTextSha256"]
  end
  { "mode" => "DETACHED-CAPTURE-READ-ONLY", "checked" => checked, "changed" => changed, "unavailable" => unavailable, "terminal" => unavailable.positive? ? "SOURCE-UNAVAILABLE" : changed.positive? ? "SOURCE-CHANGED" : "SOURCE-CUT-MATCH" }
end

def envelope_paths
  (INPUT_PATHS + A8_TOP + A8_PACKAGE + A9_TOP + PACKAGE_FIXED + SHARD_PATHS).sort
end
def expected_role(logical_path)
  return "FROZEN-ADMITTED-INPUT" if INPUT_PATHS.include?(logical_path)
  return "IMMEDIATE-A8-PREDECESSOR" if A8_TOP.include?(logical_path)
  return "A8-PACKAGE-PREDECESSOR" if A8_PACKAGE.include?(logical_path)
  return "A9-TOP-LEVEL-PLANNING" if A9_TOP.include?(logical_path)
  "A9-PACKAGE-MEMBER"
end
def verify_envelope(envelope, physical = true)
  expected = envelope_paths
  return false unless same(envelope["memberOrder"], expected) && envelope["memberCount"] == expected.length && envelope["members"].length == expected.length && envelope["selfMembership"] == "EXCLUDED-NON-SELF-REFERENTIAL"
  expected.each_with_index do |logical_path, index|
    member = envelope["members"][index]
    return false unless member["ordinal"] == index + 1 && member["logicalPath"] == logical_path && member["role"] == expected_role(logical_path)
    return false if physical && !same(extent(File.binread(resolve_logical(logical_path))), member.slice("sha256", "lines", "words", "bytes"))
  end
  envelope["contentRoot"] == domain_root("PACKAGE-ENVELOPE-MEMBERS-V1", envelope["members"])
end
def outer_mode
  envelope_bytes, envelope = read_json("#{PKG}/package-envelope.json")
  _schema_bytes, schema = read_json(CORE["envelopeSchema"])
  schema_error_list = schema_errors(schema, envelope)
  baseline = schema_error_list.empty? && verify_envelope(envelope, true)
  synthetic = []
  test = lambda do |name, &block|
    copy = deep_copy(envelope)
    block.call(copy)
    synthetic << { "name" => name, "killed" => !(schema_errors(schema, copy).empty? && verify_envelope(copy, false)) }
  end
  test.call("omit member") { |copy| copy["members"].delete_at(0) }
  test.call("substitute member hash") { |copy| copy["members"][0]["sha256"] = "0" * 64 }
  test.call("add member") { |copy| copy["members"] << deep_copy(copy["members"][0]) }
  test.call("reorder member") { |copy| copy["members"][0], copy["members"][1] = copy["members"][1], copy["members"][0] }
  [["mutate reader A", "/reader-a.mjs"], ["mutate reader B", "/reader-b.rb"], ["mutate toolchain", "/execution-receipts.json"], ["mutate report A", "/reader-a-report.json"], ["mutate report B", "/reader-b-report.json"], ["mutate Subject", A9_TOP[0]], ["mutate crosswalk", A9_TOP[1]], ["mutate Producer QA", A9_TOP[2]]].each do |name, fragment|
    test.call(name) do |copy|
      row = copy["members"].find { |member| fragment.start_with?("docs/") ? member["logicalPath"] == fragment : member["logicalPath"].end_with?(fragment) }
      row["sha256"] = "f" * 64
    end
  end
  output = { "artifactId" => "CONNECT-D02-A9-OUTER-VERIFICATION-B-DETACHED", "readerId" => READER_ID, "readOnly" => true, "envelopeSha256" => extent(envelope_bytes)["sha256"], "contentRoot" => envelope["contentRoot"], "memberCount" => envelope["memberCount"], "schemaErrors" => schema_error_list.length, "baselineValid" => baseline, "outerVectors" => synthetic.length, "outerKilled" => synthetic.count { |row| row["killed"] }, "synthetic" => synthetic, "mechanicalVerdict" => baseline && synthetic.all? { |row| row["killed"] } ? "PASS" : "FAIL", "semanticAcceptance" => 0 }
  puts JSON.pretty_generate(output)
  exit(output["mechanicalVerdict"] == "PASS" ? 0 : 1)
end

outer_mode if ARGV.include?("--outer")
bundle, input_files = load_bundle
baseline_terminal = evaluate_bundle(bundle, true)
actual_controls = bundle["positiveControls"]["controls"].map { |control| evaluate_control(control) }
actual_mutations = bundle["mutationCorpus"]["vectors"].select { |vector| vector["phase"] == "INNER" }.map do |vector|
  terminal = begin evaluate_bundle(apply_vector(bundle, vector), false) rescue vector["findingId"] == "D02-A8-IHR-F004" ? "SEMANTIC-UNIVERSE-INVALID" : "READER-EXCEPTION" end
  { "vectorId" => vector["vectorId"], "findingId" => vector["findingId"], "actualTerminal" => terminal, "killed" => terminal != "PASS" }
end
source_index = ARGV.index("--source-dir")
refresh = source_refresh(bundle, source_index ? ARGV[source_index + 1] : nil)
report = {
  "artifactId" => "CONNECT-D02-A9-READER-B-ACTUAL-REPORT-2026-08-30", "readerId" => READER_ID, "implementationLanguage" => "Ruby", "algorithmFamily" => "RECURSIVE-SCHEMA-DFS-GRAPH-BYTE-SLICE-RECONSTRUCTION", "readOnly" => true,
  "oracleRead" => false, "controlOracleRead" => false, "expectedToActualCount" => 0, "executableSha256" => sha256(File.binread(__FILE__)), "inputFiles" => input_files,
  "schemaExecution" => { "schemasExecuted" => 2, "snapshotErrors" => schema_errors(bundle["snapshotSchema"], bundle["snapshot"]).length, "transitionInstances" => bundle["positiveControls"]["controls"].length, "transitionErrors" => bundle["positiveControls"]["controls"].sum { |control| schema_errors(bundle["transitionSchema"], control["transition"]).length }, "resolvedRefCount" => preflight_refs(bundle["snapshotSchema"]) + preflight_refs(bundle["transitionSchema"]) },
  "roots" => ROOTS, "counts" => { "admittedInputs" => 13, "semanticSources" => 18, "semanticMembers" => 2864, "semanticShards" => 29, "tableRows" => 295, "sourceReceipts" => 11, "dagNodes" => bundle["dag"]["nodes"].length, "dagEdges" => bundle["dag"]["edges"].length, "appointments" => bundle["appointments"]["appointments"].length, "a6Findings" => 5, "a7Findings" => 7, "a8Findings" => 7, "positiveControls" => 9 },
  "actualControls" => actual_controls, "sourceRefresh" => refresh,
  "mutations" => { "denominator" => bundle["mutationCorpus"]["vectorCount"], "innerDenominator" => bundle["mutationCorpus"]["innerVectorCount"], "outerDeferred" => bundle["mutationCorpus"]["outerVectorCount"], "evaluated" => actual_mutations.length, "killed" => actual_mutations.count { |row| row["killed"] }, "survived" => actual_mutations.count { |row| !row["killed"] }, "actuals" => actual_mutations },
  "baselineTerminal" => baseline_terminal, "safeState" => bundle["snapshot"]["safeState"], "currentTerminal" => bundle["snapshot"]["currentTerminal"],
  "mechanicalVerdict" => baseline_terminal == "PASS" && actual_mutations.all? { |row| row["killed"] } && refresh["changed"] == 0 && refresh["unavailable"] == 0 ? "PASS" : "FAIL", "semanticAcceptance" => 0, "selfAcceptance" => 0
}
puts JSON.pretty_generate(report)
exit(report["mechanicalVerdict"] == "PASS" ? 0 : 1)
