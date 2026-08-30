#!/usr/bin/env ruby

require "digest"
require "json"
require "pathname"

SCRIPT_PATH = Pathname.new(__FILE__).realpath
PLANNING_DIR = SCRIPT_PATH.dirname
REPOSITORY_ROOT = PLANNING_DIR.join("../../..").realpath
SUBJECT_PATH = Pathname.new(ARGV[0] || PLANNING_DIR.join("three-review-protocol-v1-6-successor-requirements-2026-08-29.md")).realpath

def sha256(bytes)
  Digest::SHA256.hexdigest(bytes)
end

def frame(*values)
  values.map do |value|
    bytes = value.is_a?(String) ? value.b : value.to_s.b
    [bytes.bytesize].pack("Q>") + bytes
  end.join
end

def rooted(domain, *values)
  sha256(frame(domain, *values))
end

def canonical(value)
  case value
  when NilClass
    "null"
  when String
    JSON.generate(value)
  when TrueClass
    "true"
  when FalseClass
    "false"
  when Integer
    value.to_s
  when Array
    "[#{value.map { |item| canonical(item) }.join(",")}]"
  when Hash
    pairs = value.keys.sort.map { |key| "#{JSON.generate(key)}:#{canonical(value.fetch(key))}" }
    "{#{pairs.join(",")}}"
  else
    raise "non-canonical value type #{value.class}"
  end
end

def assert(condition, message)
  raise message unless condition
end

subject_bytes = SUBJECT_PATH.binread
subject = subject_bytes.force_encoding("UTF-8")
subject_lines = subject.each_line.to_a

def jsonl(subject_lines, name)
  inside = false
  rows = []
  subject_lines.each do |line|
    stripped = line.strip
    if stripped == "<!-- #{name}_JSONL_BEGIN -->"
      inside = true
      next
    end
    break if stripped == "<!-- #{name}_JSONL_END -->"
    next unless inside && stripped.start_with?("{")

    parsed = JSON.parse(stripped)
    assert(canonical(parsed) == stripped, "non-canonical JSON in #{name}")
    rows << parsed
  end
  assert(!rows.empty?, "missing or empty JSONL block #{name}")
  rows
end

requirements = []
current = nil
subject_lines.each do |line|
  if (heading = line.match(/^## 2\.\d+ `(MPRR-V16-REQ-\d{3})` — (.+)$/))
    requirements << current if current
    current = { "id" => heading[1], "title" => heading[2], "fields" => {} }
    next
  end
  next unless current
  break if line.start_with?("# 3.")
  field = line.match(/^\d+\.\d+\.[1-5] `(statement|defectCauseImpact|requiredProofPredicate|dependencies|sourceBasis)`: (.+)\.$/)
  next unless field

  assert(!current["fields"].key?(field[1]), "duplicate field #{current["id"]}/#{field[1]}")
  current["fields"][field[1]] = field[2]
end
requirements << current if current && requirements.last != current

assert(requirements.length == 112, "requirement denominator #{requirements.length}")
requirement_by_id = requirements.to_h { |requirement| [requirement.fetch("id"), requirement] }
dependency_edges = []
extracted_uses = []

requirements.each_with_index do |requirement, index|
  expected_id = format("MPRR-V16-REQ-%03d", index + 1)
  assert(requirement.fetch("id") == expected_id, "non-contiguous requirement #{requirement.fetch("id")}")
  assert(requirement.fetch("fields").length == 5, "five-field failure #{requirement.fetch("id")}")
  assert(requirement.dig("fields", "statement").include?(format("MPRR-V16-OUT-%03d", index + 1)), "missing atomic output #{requirement.fetch("id")}")
  requirement.fetch("fields").each do |field_name, field_value|
    occurrence = 0
    field_value.to_enum(:scan, /@(local|source)\[([^\]]+)\]/).each do
      match = Regexp.last_match
      occurrence += 1
      byte_start = field_value[0...match.begin(0)].bytesize
      byte_end = byte_start + match[0].bytesize
      provider_kind = match[1] == "local" ? "LOCAL" : "SOURCE"
      use = {
        "byteEnd" => byte_end,
        "byteStart" => byte_start,
        "consumerRequirementId" => requirement.fetch("id"),
        "field" => field_name,
        "occurrence" => occurrence,
        "providerId" => match[2],
        "providerKind" => provider_kind,
        "token" => match[0]
      }
      extracted_uses << use
      dependency_edges << { "consumer" => requirement.fetch("id"), "provider" => match[2] } if provider_kind == "LOCAL" && field_name == "dependencies"
    end
  end
end

dependency_edges.each do |edge|
  assert(requirement_by_id.key?(edge.fetch("provider")), "unknown dependency #{edge.fetch("provider")}")
  assert(edge.fetch("provider")[-3, 3].to_i < edge.fetch("consumer")[-3, 3].to_i, "non-backward dependency #{edge}")
end

carriers = jsonl(subject_lines, "SOURCE_CARRIERS")
parser_profiles = jsonl(subject_lines, "PARSER_PROFILES")
namespaces = jsonl(subject_lines, "SOURCE_NAMESPACES")
members = jsonl(subject_lines, "SOURCE_MEMBERS")
outputs = jsonl(subject_lines, "REQUIREMENT_OUTPUTS")
crosswalk = jsonl(subject_lines, "CROSSWALK")
residual_risks = jsonl(subject_lines, "RESIDUAL_RISKS")
named_uses = jsonl(subject_lines, "NAMED_USES")
terminals = jsonl(subject_lines, "TERMINALS")
failure_conditions = jsonl(subject_lines, "FAILURE_CONDITIONS")
control_machines = jsonl(subject_lines, "CONTROL_MACHINES")
control_transitions = jsonl(subject_lines, "CONTROL_TRANSITIONS")
separation_rules = jsonl(subject_lines, "SEPARATION_RULES")
dependency_families = jsonl(subject_lines, "DEPENDENCY_FAMILIES")
commit_members = jsonl(subject_lines, "COMMIT_MEMBERS")
vectors = jsonl(subject_lines, "VECTORS")

carrier_by_id = {}
carriers.each do |carrier|
  assert(!carrier_by_id.key?(carrier.fetch("carrierId")), "duplicate carrier #{carrier.fetch("carrierId")}")
  bytes = REPOSITORY_ROOT.join(carrier.fetch("path")).binread
  assert(bytes.bytesize == carrier.fetch("bytes"), "carrier byte mismatch #{carrier.fetch("carrierId")}")
  assert(sha256(bytes) == carrier.fetch("root"), "carrier root mismatch #{carrier.fetch("carrierId")}")
  assert(bytes.count("\n") == carrier.fetch("lines"), "carrier line mismatch #{carrier.fetch("carrierId")}")
  carrier_by_id[carrier.fetch("carrierId")] = carrier.merge("bytesValue" => bytes)
end

reader_a_path = PLANNING_DIR.join("three-review-protocol-v1-6-qa-reader-a-2026-08-29.mjs")
reader_a_root = sha256(reader_a_path.binread)
reader_b_root = sha256(SCRIPT_PATH.binread)
parser_profiles.each do |profile|
  computed = rooted("MPRR-V16-PARSER-PROFILE-1", profile.fetch("profileId"), profile.fetch("schema"), reader_a_root, reader_b_root)
  assert(computed == profile.fetch("parserProfileRoot"), "parser profile mismatch #{profile.fetch("profileId")}")
end

members_by_namespace = Hash.new { |hash, key| hash[key] = [] }
members.each do |member|
  carrier = carrier_by_id.fetch(member.fetch("carrierId"))
  byte_start = member.fetch("byteStart")
  byte_end = member.fetch("byteEnd")
  assert(byte_start >= 0 && byte_end <= carrier.fetch("bytesValue").bytesize && byte_start < byte_end, "invalid span #{member.fetch("memberId")}")
  selected = carrier.fetch("bytesValue").byteslice(byte_start, byte_end - byte_start)
  assert(sha256(selected) == member.fetch("memberDigest"), "member digest mismatch #{member.fetch("namespaceId")}/#{member.fetch("memberId")}")
  members_by_namespace[member.fetch("namespaceId")] << member
end

def derive_members(namespace, profile, carrier)
  bytes = carrier.fetch("bytesValue")
  if profile.fetch("mode") == "WHOLE-CARRIER"
    return [{
      "byteEnd" => bytes.bytesize,
      "byteStart" => 0,
      "memberDigest" => sha256(bytes),
      "memberId" => namespace.fetch("selector")
    }]
  end

  lines = []
  byte_start = 0
  bytes.each_byte.with_index do |byte, index|
    next unless byte == 10

    lines << { "byteStart" => byte_start, "byteEnd" => index + 1, "text" => bytes.byteslice(byte_start, index + 1 - byte_start).force_encoding("UTF-8") }
    byte_start = index + 1
  end
  lines << { "byteStart" => byte_start, "byteEnd" => bytes.bytesize, "text" => bytes.byteslice(byte_start, bytes.bytesize - byte_start).force_encoding("UTF-8") } if byte_start < bytes.bytesize

  if profile.fetch("mode") == "TABLE-ROW-PREFIX"
    return lines.select { |line| line.fetch("text").start_with?(namespace.fetch("selector")) }.map do |line|
      match = line.fetch("text").match(/`([^`]+)`/)
      assert(!match.nil?, "unable to extract table member ID #{namespace.fetch("namespaceId")}")
      {
        "byteEnd" => line.fetch("byteEnd"),
        "byteStart" => line.fetch("byteStart"),
        "memberDigest" => sha256(bytes.byteslice(line.fetch("byteStart"), line.fetch("byteEnd") - line.fetch("byteStart"))),
        "memberId" => match[1]
      }
    end
  end

  if profile.fetch("mode") == "MARKDOWN-HEADING-BLOCK"
    starts = lines.each_with_index.select { |line, _index| line.fetch("text").start_with?("## ") && line.fetch("text").include?("`#{namespace.fetch("selector")}") }
    return starts.map do |line, line_index|
      following = lines[(line_index + 1)..]&.find { |candidate| candidate.fetch("text").start_with?("## ") || candidate.fetch("text").start_with?("# ") }
      byte_end = following ? following.fetch("byteStart") : bytes.bytesize
      match = line.fetch("text").match(/`([^`]+)`/)
      assert(!match.nil?, "unable to extract heading member ID #{namespace.fetch("namespaceId")}")
      {
        "byteEnd" => byte_end,
        "byteStart" => line.fetch("byteStart"),
        "memberDigest" => sha256(bytes.byteslice(line.fetch("byteStart"), byte_end - line.fetch("byteStart"))),
        "memberId" => match[1]
      }
    end
  end

  raise "unknown parser mode #{profile.fetch("mode")}" 
end

namespaces.each do |namespace|
  list = members_by_namespace.fetch(namespace.fetch("namespaceId"), [])
  assert(list.length == namespace.fetch("memberCount"), "member count mismatch #{namespace.fetch("namespaceId")}")
  profile = parser_profiles.find { |item| item.fetch("profileId") == namespace.fetch("parserProfileId") }
  carrier = carrier_by_id.fetch(namespace.fetch("carrierId"))
  assert(!profile.nil?, "namespace parser missing #{namespace.fetch("namespaceId")}")
  derived = derive_members(namespace, profile, carrier).map { |member| canonical(member) }.sort
  declared = list.map do |member|
    canonical({
      "memberId" => member.fetch("memberId"),
      "byteStart" => member.fetch("byteStart"),
      "byteEnd" => member.fetch("byteEnd"),
      "memberDigest" => member.fetch("memberDigest")
    })
  end.sort
  assert(derived == declared, "independent member derivation mismatch #{namespace.fetch("namespaceId")}")
  member_set_root = rooted("MPRR-V16-MEMBER-SET-1", *list.map { |member| canonical(member.reject { |key, _value| key == "namespaceRoot" }) }.sort)
  assert(member_set_root == namespace.fetch("memberSetRoot"), "member set root mismatch #{namespace.fetch("namespaceId")}")
  namespace_root = rooted(
    "MPRR-V16-NAMESPACE-ENTRY-1",
    namespace.fetch("namespaceId"),
    namespace.fetch("carrierId"),
    namespace.fetch("carrierRoot"),
    namespace.fetch("parserProfileRoot"),
    namespace.fetch("memberSetRoot"),
    namespace.fetch("memberCount").to_s,
    namespace.fetch("custodyLocator"),
    namespace.fetch("selector"),
    namespace.fetch("authorityState")
  )
  assert(namespace_root == namespace.fetch("namespaceRoot"), "namespace root mismatch #{namespace.fetch("namespaceId")}")
end

member_keys = members.map { |member| "#{member.fetch("namespaceId")}/#{member.fetch("memberId")}" }.to_h { |key| [key, true] }
extracted_uses.each do |use|
  if use.fetch("providerKind") == "LOCAL"
    assert(requirement_by_id.key?(use.fetch("providerId")), "unknown local NamedUse #{use.fetch("providerId")}")
    assert(use.fetch("providerId")[-3, 3].to_i < use.fetch("consumerRequirementId")[-3, 3].to_i, "same/forward local NamedUse #{use}")
  else
    assert(member_keys.key?(use.fetch("providerId")), "unknown source NamedUse #{use.fetch("providerId")}")
  end
end
assert(extracted_uses.map { |use| canonical(use) }.sort == named_uses.map { |use| canonical(use) }.sort, "NamedUse extraction disagreement")

assert(outputs.length == requirements.length, "output denominator #{outputs.length}")
assert(outputs.map { |output| output.fetch("outputId") }.uniq.length == outputs.length, "duplicate atomic output")
outputs.each do |output|
  assert(requirement_by_id.key?(output.fetch("requirementId")), "orphan output #{output.fetch("outputId")}")
  assert(output.fetch("outputId").end_with?(output.fetch("requirementId")[-3, 3]), "non-deterministic output mapping #{output.fetch("outputId")}")
end

assert(crosswalk.length == 323, "crosswalk denominator #{crosswalk.length}")
assert(crosswalk.map { |row| row.fetch("noMergeKey") }.uniq.length == crosswalk.length, "merged Crosswalk noMergeKey")
assert(residual_risks.length == crosswalk.length, "residual risk denominator #{residual_risks.length}")
residual_by_id = residual_risks.to_h { |risk| [risk.fetch("residualRiskId"), risk] }
crosswalk.each do |row|
  assert(member_keys.key?("#{row.fetch("sourceNamespaceId")}/#{row.fetch("sourceMemberId")}"), "Crosswalk source missing #{row.fetch("rowId")}")
  assert(!row.fetch("targetRequirementIds").empty? && row.fetch("targetRequirementIds").all? { |id| requirement_by_id.key?(id) }, "Crosswalk target invalid #{row.fetch("rowId")}")
  assert(!row.fetch("sourceConjuncts").empty?, "Crosswalk conjunct empty #{row.fetch("rowId")}")
  row.fetch("sourceConjuncts").each do |conjunct|
    assert(!conjunct.fetch("sourceTextB64").empty? && conjunct.fetch("digest").length == 64 && !conjunct.fetch("targetClausePaths").empty?, "Crosswalk conjunct incomplete #{row.fetch("rowId")}")
  end
  assert(residual_by_id.key?(row.fetch("residualRiskId")), "Crosswalk risk missing #{row.fetch("rowId")}")
  assert(row.fetch("independentReceipt") == "ABSENT-BLOCKING" && row.fetch("status") == "OPEN", "premature Closure #{row.fetch("rowId")}")
end

terminal_by_id = terminals.to_h { |terminal| [terminal.fetch("terminalId"), terminal] }
assert(terminals.length == 21, "terminal denominator #{terminals.length}")
assert(terminals.map { |terminal| terminal.fetch("precedenceRank") }.uniq.length == terminals.length, "duplicate terminal precedence")
assert(failure_conditions.length == 16, "failure condition denominator #{failure_conditions.length}")
failure_conditions.each { |condition| assert(terminal_by_id.key?(condition.fetch("terminalId")), "condition terminal missing #{condition.fetch("conditionId")}") }

required_machines = ["TRUST", "CLOCK", "FINALITY", "REVIEW", "APPEAL", "CUSTODY-CONTENT", "CUSTODY-KEY", "CUSTODY-RECEIPT", "CUSTODY-PRIMARY", "CUSTODY-BACKUP", "CUSTODY-RESTORE", "MEDIA", "PUBLIC-PROJECTION", "DEPENDENCY-UNIVERSE", "BOOTSTRAP-COMMIT"]
assert(required_machines.all? { |machine_id| control_machines.any? { |machine| machine.fetch("machineId") == machine_id } }, "missing required control machine")
control_transitions.each do |transition|
  assert(control_machines.any? { |machine| machine.fetch("machineId") == transition.fetch("machineId") }, "transition unknown machine #{transition.fetch("transitionId")}")
  assert(terminal_by_id.key?(transition.fetch("terminalId")), "transition unknown terminal #{transition.fetch("transitionId")}")
end

required_dimensions = ["PersonRoot", "AppointmentRoot", "outputAuthorRoot", "CandidateAuthorRoot", "sourceOwnerRoot", "ProducerRoot", "QARoot", "AcceptorRoot", "AppellateRoot", "RiskDispositionAuthorityRoot", "agentPolicyRoot", "toolRoot", "modelRoot", "employerRoot", "controllingPrincipalRoot"]
assert(required_dimensions.all? { |dimension| separation_rules.any? { |rule| rule.fetch("dimension") == dimension } }, "separation matrix incomplete")
assert(separation_rules.all? { |rule| rule.fetch("sameValueDisposition") != "ALLOW" || rule.fetch("allowanceRequired") == true }, "unbounded separation allowance")

assert(dependency_families.length == 48, "DependencyHeadUniverse family denominator #{dependency_families.length}")
assert(dependency_families.map { |family| family.fetch("familyId") }.uniq.length == dependency_families.length, "duplicate dependency family")
assert(dependency_families.all? { |family| family.fetch("invalidationEvents").length >= 4 && family.fetch("unknownStateTerminal") == "TERM-FRESHNESS-BLOCKED" }, "incomplete dependency invalidation")

assert(commit_members.length == 22, "commit member denominator #{commit_members.length}")
assert(commit_members.map { |member| member.fetch("order") } == (1..22).to_a, "commit member order mismatch")
assert(commit_members.none? { |member| member.fetch("memberId") == "postCommitReadbackRoot" }, "causal post-readback cycle")

def select_terminal(trigger_ids, failure_conditions, terminal_by_id)
  return terminal_by_id.fetch("TERM-SUCCESS") if trigger_ids.empty?

  candidates = trigger_ids.map do |trigger_id|
    condition = failure_conditions.find { |item| item.fetch("conditionId") == trigger_id }
    condition ? terminal_by_id.fetch(condition.fetch("terminalId")) : terminal_by_id.fetch("TERM-FAIL-CLOSED-UNKNOWN")
  end
  candidates.min_by { |terminal| terminal.fetch("precedenceRank") }
end

def apply_review_event(state, instruction)
  next_state = Marshal.load(Marshal.dump(state))
  case instruction.fetch("event")
  when "CLOSE_REVIEW"
    if next_state.fetch("p0") > 0 || next_state.fetch("p1") > 0
      next_state["state"] = next_state.fetch("generation") < 2 ? "REWORK_REQUIRED" : "REJECTED_FINAL"
    elsif (next_state.fetch("p2") > 0 || next_state.fetch("p3") > 0) && next_state["validRiskDisposition"] != true
      next_state["state"] = "REJECTED_FINAL"
    else
      next_state["state"] = "READY_FOR_ACCEPTOR"
    end
  when "SUBMIT_SUCCESSOR"
    if next_state.fetch("state") == "REWORK_REQUIRED" && next_state.fetch("generation") == 1
      next_state["generation"] = 2
      next_state["state"] = "REVIEWING"
      %w[p0 p1 p2 p3 validRiskDisposition].each { |key| next_state[key] = instruction.fetch(key) }
    else
      next_state["state"] = "CONFLICT_FINAL"
    end
  when "ACCEPT"
    next_state["state"] = next_state.fetch("state") == "READY_FOR_ACCEPTOR" && instruction["selfApproval"] == false ? "ACCEPTED_PROVISIONAL" : "CONFLICT_FINAL"
  when "EXPIRE_APPEAL_WINDOW"
    next_state["state"] = next_state.fetch("state") == "ACCEPTED_PROVISIONAL" && instruction["trustedTime"] == true ? "ACCEPTED_FINAL" : "CONFLICT_FINAL"
  when "FILE_APPEAL"
    eligible = ["ACCEPTED_PROVISIONAL", "REJECTED_FINAL"].include?(next_state.fetch("state")) && next_state.fetch("appealCount") == 0 && instruction["timely"] == true && instruction["independent"] == true
    if eligible
      next_state["appealCount"] = 1
      next_state["state"] = "APPEAL_FROZEN"
    else
      next_state["state"] = "CONFLICT_FINAL"
    end
  when "REMAND"
    if next_state.fetch("state") == "APPEAL_FROZEN" && next_state.fetch("generation") == 1
      next_state["generation"] = 2
      next_state["state"] = "REVIEWING"
    else
      next_state["state"] = "CONFLICT_FINAL"
    end
  when "AFFIRM"
    next_state["state"] = next_state.fetch("state") == "APPEAL_FROZEN" ? "AFFIRMED_FINAL" : "CONFLICT_FINAL"
  when "REVOKE"
    next_state["state"] = "REVOKED_FINAL"
  else
    next_state["state"] = "CONFLICT_FINAL"
  end
  next_state
end

vectors.each do |vector|
  state = Marshal.load(Marshal.dump(vector.fetch("fixture")))
  terminal = terminal_by_id.fetch("TERM-SUCCESS")
  vector.fetch("program").each do |instruction|
    case instruction.fetch("op")
    when "LOAD_MEMBER"
      member = members.find { |item| item.fetch("namespaceId") == instruction.fetch("namespaceId") && item.fetch("memberId") == instruction.fetch("memberId") }
      assert(!member.nil?, "vector member missing #{vector.fetch("vectorId")}")
      carrier = carrier_by_id.fetch(member.fetch("carrierId"))
      bytes = carrier.fetch("bytesValue").byteslice(member.fetch("byteStart"), member.fetch("byteEnd") - member.fetch("byteStart"))
      state = { "bytesHex" => bytes.unpack1("H*") }
    when "ASSERT_SHA256"
      assert(sha256([state.fetch("bytesHex")].pack("H*")) == instruction.fetch("hex"), "vector preimage mismatch #{vector.fetch("vectorId")}")
    when "XOR_BYTE"
      bytes = [state.fetch("bytesHex")].pack("H*").bytes
      offset = instruction.fetch("offset")
      assert(offset >= 0 && offset < bytes.length, "vector XOR path invalid #{vector.fetch("vectorId")}")
      bytes[offset] ^= instruction.fetch("mask")
      state = { "bytesHex" => bytes.pack("C*").unpack1("H*") }
    when "SET_TRIGGER_SET"
      state = state.merge("triggerIds" => instruction.fetch("triggerIds").sort)
    when "EVALUATE_TERMINAL"
      terminal = select_terminal(state.fetch("triggerIds", []), failure_conditions, terminal_by_id)
    when "REVIEW_EVENT"
      state = apply_review_event(state, instruction)
    else
      raise "unknown vector operation #{instruction.fetch("op")}" 
    end
  end
  post_root = rooted("MPRR-V16-VECTOR-POST-STATE-1", canonical(state))
  assert(post_root == vector.fetch("expectedPostRoot"), "vector post root mismatch #{vector.fetch("vectorId")}")
  assert(canonical(terminal) == canonical(vector.fetch("expectedTerminal")), "vector terminal mismatch #{vector.fetch("vectorId")}")
  oracle = vector.fetch("sideEffectOracle")
  assert(oracle.fetch("durableWriteCount") == 0 && oracle.fetch("authorityOutputCount") == 0 && oracle.fetch("publicationCount") == 0, "unsafe vector oracle #{vector.fetch("vectorId")}")
end

lifecycle_vectors = vectors.select { |vector| vector.fetch("family") == "REVIEW-LIFECYCLE" }
assert(lifecycle_vectors.length >= 8, "two-generation vector denominator #{lifecycle_vectors.length}")
%w[ACCEPTED_FINAL REJECTED_FINAL REVOKED_FINAL CONFLICT_FINAL].each do |state|
  assert(lifecycle_vectors.any? { |vector| vector["expectedFinalLifecycleState"] == state }, "missing lifecycle terminal proof #{state}")
end

expected_finding_ids = (1..16).map { |index| format("MPRR-V15-HR-F%03d", index) }
assert(expected_finding_ids.all? { |finding_id| crosswalk.count { |row| row.fetch("sourceMemberId") == finding_id } == 1 }, "Finding closure not one-to-one")
assert(requirements.first(16).all? { |requirement| requirement.dig("fields", "requiredProofPredicate").include?("independentReceipt=ABSENT-BLOCKING") }, "remediation premature semantic Closure")

report = {
  "authority" => {
    "acceptance" => 0,
    "b0Admission" => 0,
    "closure" => 0,
    "gate29" => "BLOCKED",
    "producerSemanticAuthority" => 0,
    "publication" => 0,
    "repositoryVisibility" => "PUBLIC-PERMANENT"
  },
  "counters" => {
    "backwardDependencyEdges" => dependency_edges.length,
    "carriers" => carriers.length,
    "commitMembers" => commit_members.length,
    "controlMachines" => control_machines.length,
    "controlTransitions" => control_transitions.length,
    "crosswalkRows" => crosswalk.length,
    "dependencyFamilies" => dependency_families.length,
    "failureConditions" => failure_conditions.length,
    "findingRemediations" => 16,
    "lifecycleVectors" => lifecycle_vectors.length,
    "namedUses" => named_uses.length,
    "namespaces" => namespaces.length,
    "parserProfiles" => parser_profiles.length,
    "requirementFields" => requirements.length * 5,
    "requirementOutputs" => outputs.length,
    "requirements" => requirements.length,
    "residualRisks" => residual_risks.length,
    "separationRules" => separation_rules.length,
    "sourceMembers" => members.length,
    "terminals" => terminals.length,
    "v15Preservations" => 96,
    "vectors" => vectors.length
  },
  "reader" => "B-RUBY-LINE-STATE-MACHINE-AND-INTERPRETER",
  "readerRoot" => reader_b_root,
  "subject" => {
    "bytes" => subject_bytes.bytesize,
    "lines" => subject_bytes.count("\n"),
    "path" => SUBJECT_PATH.to_s,
    "root" => sha256(subject_bytes)
  },
  "verdict" => "MECHANICAL-CANDIDATE-PASS;SEMANTIC-CLOSURE-ZERO-PENDING-INDEPENDENT-REVIEW"
}

STDOUT.write("#{canonical(report)}\n")
