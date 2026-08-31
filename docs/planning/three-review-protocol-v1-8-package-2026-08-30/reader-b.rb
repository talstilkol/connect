#!/usr/bin/env ruby

require "digest"
require "json"
require "open3"
require "pathname"

package_dir = Pathname.new(ARGV[0] || __dir__).realpath
report_index = ARGV.index("--report")
report_path = report_index ? Pathname.new(ARGV[report_index + 1]).expand_path : nil
repository_root = package_dir.join("../../..").realpath
package_logical_root = "docs/planning/three-review-protocol-v1-8-package-2026-08-30"
semantic_shard_names = %w[
  semantic-preservation-000001-030000.jsonl
  semantic-preservation-030001-057466.jsonl
]
public_regular_git_member_byte_limit_exclusive = 50 * 1024 * 1024
required_payload_names = %w[
  subject.md normative-registry.json closure-crosswalk.jsonl contract-preservation.json
  predecessor-finding-preservation.jsonl causal-vectors.jsonl causal-source-graph.json
] + semantic_shard_names
required_tools = {
  "DETERMINISTIC-PRODUCER" => "#{package_logical_root}/generate.mjs",
  "INDEPENDENT-MECHANICAL-READER-A" => "#{package_logical_root}/reader-a.mjs",
  "INDEPENDENT-MECHANICAL-READER-B" => "#{package_logical_root}/reader-b.rb"
}.freeze
required_tool_roles = required_tools.keys
required_frozen_paths = %w[
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/subject.md
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/normative-registry.json
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/requirement-outputs.jsonl
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/closure-crosswalk.jsonl
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/predecessor-closure.jsonl
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/predecessor-clause-crosswalk.jsonl
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/predecessor-semantic-predicates.jsonl
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/causal-vectors.jsonl
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/causal-source-graph.json
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/semantic-use-index.jsonl
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/normative-package-manifest.json
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/generate.mjs
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/reader-a.mjs
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/reader-b.rb
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/qa-reader-a-report.json
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/qa-reader-b-report.json
  docs/planning/three-review-protocol-v1-7-package-2026-08-30/producer-qa.md
  docs/planning/three-review-protocol-v1-7-independent-hostile-review-2026-08-30.md
  docs/planning/three-review-protocol-v1-7-independent-hostile-review-findings-manifest-2026-08-30.md
  docs/planning/three-review-protocol-v1-6-successor-requirements-2026-08-30.md
  docs/planning/three-review-protocol-v1-6-successor-requirements-independent-hostile-review-2026-08-30.md
  docs/planning/three-review-protocol-v1-6-successor-requirements-independent-hostile-review-findings-manifest-2026-08-30.md
  docs/planning/three-review-protocol-v1-5-successor-requirements-2026-08-29.md
  docs/planning/three-review-protocol-v1-5-successor-requirements-independent-hostile-review-findings-manifest-2026-08-29.md
  docs/planning/master-plan-three-review-reconciliation-protocol-2026-08-29.md
  docs/planning/three-review-intake-and-reconciliation-eligibility-assessment-2026-08-29.md
  docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v3-2026-08-29.md
  docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md
]

sha256 = ->(bytes) { Digest::SHA256.hexdigest(bytes) }
frame = lambda do |*values|
  values.map do |value|
    bytes = value.is_a?(String) ? value.b : value.to_s.b
    [bytes.bytesize].pack("Q>") + bytes
  end.join
end
rooted = ->(domain, version, *values) { sha256.call(frame.call(domain, version, *values)) }
byte_sort = ->(values) { values.sort { |left, right| left.b <=> right.b } }
canonical = nil
canonical = lambda do |value|
  case value
  when NilClass then "null"
  when String
    raise "invalid or non-NFC string" unless value.valid_encoding? && value.codepoints.none? { |point| point.between?(0xD800, 0xDFFF) } && value == value.unicode_normalize(:nfc)
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
line_count = lambda do |bytes|
  next 0 if bytes.empty?
  count = bytes.count("\n")
  bytes.end_with?("\n") ? count : count + 1
end
line_number_at = ->(bytes, offset) { bytes.byteslice(0, offset).count("\n") + 1 }
exact_set = lambda do |left, right|
  left.length == left.uniq.length && right.length == right.uniq.length && byte_sort.call(left).join("\n") == byte_sort.call(right).join("\n")
end
parse_canonical = lambda do |text|
  value = JSON.parse(text)
  raise "non-canonical JSON bytes" unless "#{canonical.call(value)}\n" == text
  value
end
read_canonical_json = ->(path) { parse_canonical.call(path.binread) }
read_canonical_jsonl = lambda do |path|
  text = path.binread
  raise "JSONL missing final LF: #{path}" unless text.end_with?("\n")
  text.delete_suffix("\n").split("\n").reject(&:empty?).map do |line|
    value = JSON.parse(line)
    raise "non-canonical JSONL record: #{path}" unless canonical.call(value) == line
    value
  end
end
core_root = lambda do |domain, record, root_field|
  core = record.reject { |key, _| key == root_field }
  rooted.call(domain, "1", canonical.call(core))
end
label_root = ->(label) { sha256.call("MPRR-V18-SYMBOLIC-TEST-ROOT:#{label}".b) }
logical = ->(name) { "#{package_logical_root}/#{name}" }

counters = %w[
  authorityMismatch canonicalMismatch casMismatch closureMismatch frozenInputMismatch graphMismatch guardMismatch
  manifestMismatch outputModeMismatch packageRootMismatch parserMismatch pathMismatch predecessorMismatch publicMismatch readerMutationMismatch schemaMismatch semanticMismatch
  toolRootMismatch unresolvedSchemaReference vectorMismatch
].to_h { |name| [name, 0] }
counters["outputModeMismatch"] += 1 if report_path && (report_path == package_dir || report_path.to_s.start_with?("#{package_dir}/"))
counters["outputModeMismatch"] += 1 if %w[semantic-preservation.jsonl reports/qa-reader-a-report.json reports/qa-reader-b-report.json].any? { |name| package_dir.join(name).exist? }

manifest = read_canonical_json.call(package_dir.join("normative-package-manifest.json"))
registry = read_canonical_json.call(package_dir.join("normative-registry.json"))
closure_rows = read_canonical_jsonl.call(package_dir.join("closure-crosswalk.jsonl"))
contract_preservation = read_canonical_json.call(package_dir.join("contract-preservation.json"))
predecessor_rows = read_canonical_jsonl.call(package_dir.join("predecessor-finding-preservation.jsonl"))
semantic_shard_rows = semantic_shard_names.map { |name| read_canonical_jsonl.call(package_dir.join(name)) }
semantic_rows = semantic_shard_rows.flatten
vectors = read_canonical_jsonl.call(package_dir.join("causal-vectors.jsonl"))
graph = read_canonical_json.call(package_dir.join("causal-source-graph.json"))
immutable_reader_paths = (required_payload_names + %w[normative-package-manifest.json generate.mjs reader-a.mjs reader-b.rb]).map { |name| package_dir.join(name) }
immutable_reader_snapshot = immutable_reader_paths.to_h do |path|
  bytes = path.binread
  [path.to_s, "#{sha256.call(bytes)}:#{bytes.bytesize}"]
end

counters["pathMismatch"] += 1 unless repository_root.join("docs").realpath == package_dir.join("../..").realpath
git_top_text, git_top_status = Open3.capture2("git", "-C", repository_root.to_s, "rev-parse", "--show-toplevel")
git_origin, git_origin_status = Open3.capture2("git", "-C", repository_root.to_s, "config", "--get", "remote.origin.url")
git_top = Pathname.new(git_top_text.strip).realpath
git_bytes = lambda do |*args|
  output, status = Open3.capture2("git", "-C", repository_root.to_s, *args)
  raise "git read failed: #{args.join(" ")}" unless status.success?
  output.b
end
observed_git_head = git_bytes.call("rev-parse", "HEAD").strip
observed_git_ref = git_bytes.call("rev-parse", "--abbrev-ref", "HEAD").strip
observed_index_listing_root = sha256.call(git_bytes.call("ls-files", "--stage"))
observed_tracked_diff_root = sha256.call(git_bytes.call("diff", "--binary", "--", ".", ":(exclude)#{package_logical_root}/**"))
observed_external_untracked_paths = git_bytes.call("ls-files", "--others", "--exclude-standard").force_encoding("UTF-8").strip.split("\n").reject(&:empty?).reject { |path| path.start_with?("#{package_logical_root}/") }
observed_external_untracked_set_root = rooted.call("MPRR-V18-EXTERNAL-UNTRACKED-SET", "1", *byte_sort.call(observed_external_untracked_paths))
observed_git_state_root = rooted.call("MPRR-V18-GIT-STATE", "1", observed_git_head, observed_git_ref, observed_index_listing_root, observed_tracked_diff_root, observed_external_untracked_set_root)
identity = registry["repositoryIdentity"]
identity_matches = observed_git_head == identity["expectedGitHead"] && observed_git_ref == identity["expectedGitRef"] && observed_index_listing_root == identity["indexListingRoot"] && observed_tracked_diff_root == identity["trackedDiffRoot"] && observed_external_untracked_set_root == identity["externalUntrackedSetRoot"] && observed_git_state_root == identity["gitStateRoot"]
counters["pathMismatch"] += 1 unless git_top_status.success? && git_origin_status.success? && git_top == repository_root && git_origin.strip == identity["expectedOrigin"] && identity_matches

payload_paths = manifest["payloadMembers"].map { |item| item["path"] }
expected_payload_paths = required_payload_names.map { |name| logical.call(name) }
counters["manifestMismatch"] += 1 unless exact_set.call(payload_paths, expected_payload_paths)
payload_canonical_records = []
manifest["payloadMembers"].each do |member|
  member_path = member["path"]
  if Pathname.new(member_path).absolute? || member_path.split("/").include?("..") || !expected_payload_paths.include?(member_path)
    counters["pathMismatch"] += 1
    next
  end
  physical = repository_root.join(member_path).realpath
  counters["pathMismatch"] += 1 unless physical.to_s.start_with?("#{package_dir}/")
  bytes = physical.binread
  counters["manifestMismatch"] += 1 unless sha256.call(bytes) == member["root"] && bytes.bytesize == member["bytes"] && line_count.call(bytes) == member["lines"] && bytes.bytesize < public_regular_git_member_byte_limit_exclusive
  payload_canonical_records << canonical.call(member)
end

counters["toolRootMismatch"] += 1 unless exact_set.call(manifest["producerTools"].map { |item| item["role"] }, required_tool_roles)
tool_by_role = manifest["producerTools"].to_h { |item| [item["role"], item] }
manifest["producerTools"].each do |tool|
  tool_path = tool["path"]
  if Pathname.new(tool_path).absolute? || tool_path.split("/").include?("..") || required_tools[tool["role"]] != tool_path
    counters["pathMismatch"] += 1
    next
  end
  counters["toolRootMismatch"] += 1 unless sha256.call(repository_root.join(tool_path).binread) == tool["root"]
end
computed_package_root = rooted.call(
  "MPRR-V18-NORMATIVE-PACKAGE",
  "1",
  *byte_sort.call(payload_canonical_records),
  tool_by_role.dig("DETERMINISTIC-PRODUCER", "root").to_s,
  tool_by_role.dig("INDEPENDENT-MECHANICAL-READER-A", "root").to_s,
  tool_by_role.dig("INDEPENDENT-MECHANICAL-READER-B", "root").to_s
)
expected_constructor = "SHA-256(CPB1(MPRR-V18-NORMATIVE-PACKAGE,1,sorted-canonical-payload-records,generatorRoot,readerARoot,readerBRoot))"
counters["packageRootMismatch"] += 1 unless manifest["packageRootConstructor"] == expected_constructor && computed_package_root == manifest["packageRoot"]

unless exact_set.call(manifest["frozenInputs"].map { |item| item["path"] }, required_frozen_paths) && exact_set.call(contract_preservation["sourceUniverse"].map { |item| item["path"] }, required_frozen_paths)
  counters["frozenInputMismatch"] += 1
end
manifest["frozenInputs"].each do |frozen|
  frozen_path = frozen["path"]
  if Pathname.new(frozen_path).absolute? || frozen_path.split("/").include?("..")
    counters["pathMismatch"] += 1
    next
  end
  physical = repository_root.join(frozen_path).realpath
  counters["pathMismatch"] += 1 unless physical.to_s.start_with?("#{repository_root}/")
  bytes = physical.binread
  counters["frozenInputMismatch"] += 1 unless sha256.call(bytes) == frozen["root"] && bytes.bytesize == frozen["bytes"] && line_count.call(bytes) == frozen["lines"]
end
source_universe_root = rooted.call("MPRR-V18-SOURCE-UNIVERSE", "1", *byte_sort.call(contract_preservation["sourceUniverse"].map { |item| canonical.call(item) }))
unless source_universe_root == contract_preservation["sourceUniverseRoot"] && contract_preservation["predecessorPackageRoot"] == "495ba345115f7623802adef7d7268ba7a6fe7049e68f9b04866f77f3602b5d39"
  counters["frozenInputMismatch"] += 1
end

v17_registry_snapshot = JSON.parse(repository_root.join("docs/planning/three-review-protocol-v1-7-package-2026-08-30/normative-registry.json").binread)
expected_parser_profile_ids = %w[V15-PREDECESSOR-EXACT-SPAN-1 V16-FINDING-BLOCK-1 V16-REQUIREMENT-BLOCK-1 WHOLE-CARRIER-1]
counters["parserMismatch"] += 1 unless exact_set.call(v17_registry_snapshot["parserProfiles"].map { |item| item["profileId"] }, expected_parser_profile_ids)
v17_registry_snapshot["parserProfiles"].each do |profile|
  core = { "mode" => profile["mode"], "profileId" => profile["profileId"], "repositoryRootRule" => profile["repositoryRootRule"], "selectionRule" => profile["selectionRule"] }
  counters["parserMismatch"] += 1 unless rooted.call("MPRR-V17-PARSER-PROFILE", "1", canonical.call(core)) == profile["parserProfileRoot"]
end
v17_carrier_bytes = {}
v17_carrier_by_id = {}
v17_registry_snapshot["sourceCarriers"].each do |carrier|
  carrier_path = carrier["path"]
  unless required_frozen_paths.include?(carrier_path) && !Pathname.new(carrier_path).absolute? && !carrier_path.split("/").include?("..")
    counters["parserMismatch"] += 1
    next
  end
  physical = repository_root.join(carrier_path).realpath
  counters["parserMismatch"] += 1 unless physical.to_s.start_with?("#{repository_root}/")
  bytes = physical.binread
  counters["parserMismatch"] += 1 unless sha256.call(bytes) == carrier["root"] && bytes.bytesize == carrier["bytes"] && line_count.call(bytes) == carrier["lines"]
  v17_carrier_bytes[carrier["carrierId"]] = bytes
  v17_carrier_by_id[carrier["carrierId"]] = carrier
end
split_buffer_lines = lambda do |bytes|
  result = []
  start = 0
  bytes.bytes.each_with_index do |byte, index|
    next unless byte == 10
    result << { "byteStart" => start, "byteEndExclusive" => index + 1, "bytes" => bytes.byteslice(start, index + 1 - start) }
    start = index + 1
  end
  result << { "byteStart" => start, "byteEndExclusive" => bytes.bytesize, "bytes" => bytes.byteslice(start, bytes.bytesize - start) } if start < bytes.bytesize
  result
end
find_heading_blocks = lambda do |bytes, heading_pattern, boundary_pattern|
  lines = split_buffer_lines.call(bytes)
  headings = lines.each_index.select { |index| lines[index]["bytes"].force_encoding("UTF-8").match?(heading_pattern) }
  boundaries = lines.each_index.select { |index| lines[index]["bytes"].force_encoding("UTF-8").match?(boundary_pattern) }
  headings.each_with_index.map do |line_index, ordinal|
    text_value = lines[line_index]["bytes"].force_encoding("UTF-8")
    match = text_value.match(heading_pattern)
    next_boundary = boundaries.find { |candidate| candidate > line_index }
    byte_start = lines[line_index]["byteStart"]
    byte_end_exclusive = next_boundary ? lines[next_boundary]["byteStart"] : bytes.bytesize
    { "byteStart" => byte_start, "byteEndExclusive" => byte_end_exclusive, "memberId" => match[1], "ordinal" => ordinal + 1, "selected" => bytes.byteslice(byte_start, byte_end_exclusive - byte_start) }
  end
end
v16_subject_bytes = v17_carrier_bytes["V16-SUBJECT"]
v16_findings_bytes = v17_carrier_bytes["V16-FINDINGS"]
requirement_blocks = find_heading_blocks.call(v16_subject_bytes, /^## 2\.\d+ `(MPRR-V16-REQ-\d{3})` — (.+)$/, /^\#{1,2} /)
finding_blocks = find_heading_blocks.call(v16_findings_bytes, /^### \d+\.\d+ (MPRR-V16-IHR-F\d{3}) — (.+)$/, /^\#{1,3} /)
v16_predecessor_rows = split_buffer_lines.call(v16_subject_bytes).map { |line| line["bytes"].force_encoding("UTF-8").strip }.select { |line| line.start_with?("{") && line.include?('"rowId":"MPRR-V16-XW-') }.map { |line| JSON.parse(line) }
counters["parserMismatch"] += 1 unless requirement_blocks.length == 112 && finding_blocks.length == 31 && v16_predecessor_rows.length == 323
predecessor_namespace_specs = {
  "V15HR" => { "carrierId" => "V15-FINDINGS", "namespaceId" => "V15-FINDINGS" },
  "V15REQ" => { "carrierId" => "V15-SUBJECT", "namespaceId" => "V15-REQUIREMENTS" },
  "V15XW" => { "carrierId" => "V15-SUBJECT", "namespaceId" => "V15-CROSSWALK" }
}
predecessor_blocks_by_namespace = predecessor_namespace_specs.values.to_h { |item| [item["namespaceId"], []] }
v16_predecessor_rows.each do |row|
  spec = predecessor_namespace_specs[row["sourceNamespaceId"]]
  span = row["sourceSpan"].to_s.match(/\A(\d+)-(\d+)\z/)
  unless spec && span
    counters["parserMismatch"] += 1
    next
  end
  bytes = v17_carrier_bytes[spec["carrierId"]]
  byte_start = span[1].to_i
  byte_end_exclusive = span[2].to_i
  selected = bytes&.byteslice(byte_start, byte_end_exclusive - byte_start)
  unless selected && byte_start >= 0 && byte_end_exclusive > byte_start && byte_end_exclusive <= bytes.bytesize && sha256.call(selected) == row["sourceMemberDigest"]
    counters["parserMismatch"] += 1
    next
  end
  predecessor_blocks_by_namespace[spec["namespaceId"]] << { "byteStart" => byte_start, "byteEndExclusive" => byte_end_exclusive, "memberId" => row["sourceMemberId"], "selected" => selected }
end
parser_by_id = v17_registry_snapshot["parserProfiles"].to_h { |item| [item["profileId"], item] }
namespace_specs = [
  ["V16-REQUIREMENTS", "V16-SUBJECT", "V16-REQUIREMENT-BLOCK-1", requirement_blocks, "MPRR-V16-REQ-[0-9]{3}"],
  ["V16-FINDINGS", "V16-FINDINGS", "V16-FINDING-BLOCK-1", finding_blocks, "MPRR-V16-IHR-F[0-9]{3}"],
  ["V15-FINDINGS", "V15-FINDINGS", "V15-PREDECESSOR-EXACT-SPAN-1", predecessor_blocks_by_namespace["V15-FINDINGS"], "MPRR-V15-HR-F[0-9]{3}"],
  ["V15-REQUIREMENTS", "V15-SUBJECT", "V15-PREDECESSOR-EXACT-SPAN-1", predecessor_blocks_by_namespace["V15-REQUIREMENTS"], "MPRR-V15-REQ-[0-9]{3}"],
  ["V15-CROSSWALK", "V15-SUBJECT", "V15-PREDECESSOR-EXACT-SPAN-1", predecessor_blocks_by_namespace["V15-CROSSWALK"], "MPRR-V15-XW-[0-9]{3}"]
]
v17_registry_snapshot["sourceCarriers"].each do |carrier|
  namespace_specs << ["CARRIER-#{carrier["carrierId"]}", carrier["carrierId"], "WHOLE-CARRIER-1", [{ "byteStart" => 0, "byteEndExclusive" => carrier["bytes"], "memberId" => "CARRIER-#{carrier["carrierId"]}", "selected" => v17_carrier_bytes[carrier["carrierId"]] }], "CARRIER-#{carrier["carrierId"]}"]
end
discovered_parser_members = []
discovered_parser_namespaces = []
namespace_specs.each do |namespace_id, carrier_id, profile_id, blocks, selector|
  carrier = v17_carrier_by_id[carrier_id]
  bytes = v17_carrier_bytes[carrier_id]
  unless carrier && bytes && parser_by_id.key?(profile_id) && blocks
    counters["parserMismatch"] += 1
    next
  end
  sorted_blocks = blocks.sort_by { |block| block["byteStart"] }
  duplicate = sorted_blocks.map { |block| block["memberId"] }.uniq.length != sorted_blocks.length
  overlap = sorted_blocks.each_index.any? { |index| index.positive? && sorted_blocks[index - 1]["byteEndExclusive"] > sorted_blocks[index]["byteStart"] }
  counters["parserMismatch"] += 1 if duplicate || overlap
  cores = sorted_blocks.map do |block|
    core = {
      "byteEndExclusive" => block["byteEndExclusive"], "byteStart" => block["byteStart"], "carrierId" => carrier_id, "carrierRoot" => carrier["root"],
      "lineEndExclusive" => line_number_at.call(bytes, block["byteEndExclusive"]), "lineStartInclusive" => line_number_at.call(bytes, block["byteStart"]),
      "memberDigest" => sha256.call(block["selected"]), "memberId" => block["memberId"], "namespaceId" => namespace_id,
      "parserProfileRoot" => parser_by_id[profile_id]["parserProfileRoot"], "schema" => "MPRR-V17-MEMBER-CORE-1"
    }
    core.merge("memberCoreRoot" => rooted.call("MPRR-V17-MEMBER-CORE", "1", canonical.call(core)))
  end
  member_set_root = rooted.call("MPRR-V17-MEMBER-SET", "1", *byte_sort.call(cores.map { |item| item["memberCoreRoot"] }))
  namespace_core = { "carrierId" => carrier_id, "carrierRoot" => carrier["root"], "custodyLocator" => carrier["custodyLocator"], "memberCount" => cores.length, "memberSetRoot" => member_set_root, "namespaceId" => namespace_id, "parserProfileRoot" => parser_by_id[profile_id]["parserProfileRoot"], "schema" => "MPRR-V17-NAMESPACE-CORE-1", "selector" => selector }
  namespace_root = rooted.call("MPRR-V17-NAMESPACE", "1", canonical.call(namespace_core))
  discovered_parser_namespaces << namespace_core.merge("namespaceRoot" => namespace_root)
  cores.each { |core| discovered_parser_members << core.merge("namespaceRoot" => namespace_root) }
end
unless exact_set.call(discovered_parser_members.map { |item| canonical.call(item) }, v17_registry_snapshot["sourceMembers"].map { |item| canonical.call(item) }) && exact_set.call(discovered_parser_namespaces.map { |item| canonical.call(item) }, v17_registry_snapshot["sourceNamespaces"].map { |item| canonical.call(item) })
  counters["parserMismatch"] += 1
end
parser_rediscovery_set_root = rooted.call("MPRR-V18-PARSER-REDISCOVERY-SET", "1", *byte_sort.call((v17_registry_snapshot["parserProfiles"] + discovered_parser_namespaces + discovered_parser_members).map { |item| canonical.call(item) }))
parser_contract = registry["parserRediscoveryContract"]
unless parser_rediscovery_set_root == parser_contract["rediscoverySetRoot"] && parser_contract["sourceMemberCount"] == discovered_parser_members.length && parser_contract["sourceNamespaceCount"] == discovered_parser_namespaces.length
  counters["parserMismatch"] += 1
end

schema_by_id = registry["schemas"].to_h { |schema| [schema["schemaId"], schema] }
counters["schemaMismatch"] += 1 unless schema_by_id.length == registry["schemas"].length
validate_record = nil
type_valid = nil
type_valid = lambda do |value, type|
  if type.start_with?("nullable:")
    value.nil? || type_valid.call(value, type.delete_prefix("nullable:"))
  elsif type.start_with?("enum:")
    value.is_a?(String) && type.delete_prefix("enum:").split("|").include?(value)
  elsif type == "string"
    value.is_a?(String) && value.valid_encoding? && value.codepoints.none? { |point| point.between?(0xD800, 0xDFFF) } && value == value.unicode_normalize(:nfc)
  elsif type == "sha256"
    value.is_a?(String) && value.match?(/\A[0-9a-f]{64}\z/)
  elsif type == "uint"
    value.is_a?(Integer) && value >= 0 && value <= 9_007_199_254_740_991
  elsif type == "boolean"
    value == true || value == false
  elsif type == "object"
    value.is_a?(Hash)
  elsif type == "array<object>"
    value.is_a?(Array) && value.all? { |item| item.is_a?(Hash) }
  elsif type == "array<string>"
    value.is_a?(Array) && value.all? { |item| item.is_a?(String) && item.valid_encoding? && item.codepoints.none? { |point| point.between?(0xD800, 0xDFFF) } && item == item.unicode_normalize(:nfc) }
  elsif type == "array<sha256>"
    value.is_a?(Array) && value.all? { |item| item.is_a?(String) && item.match?(/\A[0-9a-f]{64}\z/) }
  elsif type.start_with?("object:")
    value.is_a?(Hash) && validate_record.call(value, type.delete_prefix("object:"))
  elsif type.start_with?("array<object>:")
    value.is_a?(Array) && value.all? { |item| item.is_a?(Hash) && validate_record.call(item, type.delete_prefix("array<object>:")) }
  else
    false
  end
end
validate_record = lambda do |record, schema_id|
  schema = schema_by_id[schema_id]
  next false unless schema
  keys = record.keys
  next false if schema["unknownFieldPolicy"] == "REJECT" && keys.any? { |key| !schema["fieldTypes"].key?(key) }
  next false if schema["requiredFields"].any? { |key| !record.key?(key) }
  record.all? { |key, value| schema["fieldTypes"].key?(key) && type_valid.call(value, schema["fieldTypes"][key]) }
end

registry["schemas"].each do |schema|
  descriptor_valid = schema["fieldTypes"].values.all? do |type|
    primitive = %w[string sha256 uint boolean object array<object> array<string> array<sha256>].include?(type) || type.start_with?("enum:") || type.start_with?("nullable:")
    nested = type.start_with?("object:") && schema_by_id.key?(type.delete_prefix("object:"))
    nested_array = type.start_with?("array<object>:") && schema_by_id.key?(type.delete_prefix("array<object>:"))
    primitive || nested || nested_array
  end
  good = validate_record.call(schema, "SCHEMA-SCHEMA") && !schema["fieldTypes"].empty? && exact_set.call(schema["requiredFields"], schema["fieldTypes"].keys) && schema["unknownFieldPolicy"] == "REJECT" && descriptor_valid && core_root.call("MPRR-V18-SCHEMA", schema, "schemaRoot") == schema["schemaRoot"]
  counters["schemaMismatch"] += 1 unless good
end
unless validate_record.call(registry, "SCHEMA-REGISTRY") && validate_record.call(manifest, "SCHEMA-MANIFEST") && validate_record.call(contract_preservation, "SCHEMA-CONTRACT-PRESERVATION") && validate_record.call(registry["authorityState"], "SCHEMA-AUTHORITY-STATE") && validate_record.call(manifest["authorityState"], "SCHEMA-AUTHORITY-STATE")
  counters["schemaMismatch"] += 1
end
[
  [registry["repositoryIdentity"], "SCHEMA-REPOSITORY-IDENTITY", "identityRoot", "MPRR-V18-REPOSITORY-IDENTITY"],
  [registry["canonicalContract"], "SCHEMA-CANONICAL-CONTRACT", "canonicalRoot", "MPRR-V18-CANONICAL-CONTRACT"],
  [registry["acceptanceContract"], "SCHEMA-ACCEPTANCE-CONTRACT", "acceptanceRoot", "MPRR-V18-ACCEPTANCE-CONTRACT"],
  [registry["casContract"], "SCHEMA-CAS-CONTRACT", "casRoot", "MPRR-V18-CAS-CONTRACT"],
  [registry["recoveryContract"], "SCHEMA-RECOVERY-CONTRACT", "recoveryRoot", "MPRR-V18-RECOVERY-CONTRACT"],
  [registry["parserRediscoveryContract"], "SCHEMA-PARSER-REDISCOVERY-CONTRACT", "contractRoot", "MPRR-V18-PARSER-REDISCOVERY-CONTRACT"],
  [registry["machineExecutionContract"], "SCHEMA-MACHINE-EXECUTION-CONTRACT", "contractRoot", "MPRR-V18-MACHINE-EXECUTION-CONTRACT"],
  [registry["publicInvariant"], "SCHEMA-PUBLIC-INVARIANT", "publicRoot", "MPRR-V18-PUBLIC-INVARIANT"],
  [registry["governance"], "SCHEMA-GOVERNANCE", "governanceRoot", "MPRR-V18-GOVERNANCE"],
  [registry["semanticPreservationContract"], "SCHEMA-SEMANTIC-PRESERVATION-CONTRACT", "semanticRoot", "MPRR-V18-SEMANTIC-PRESERVATION-CONTRACT"]
].each do |record, schema_id, root_field, domain|
  counters["schemaMismatch"] += 1 unless validate_record.call(record, schema_id) && core_root.call(domain, record, root_field) == record[root_field]
end
[
  [registry["controls"], "SCHEMA-CONTROL", "controlRoot", "MPRR-V18-CONTROL"],
  [registry["guards"], "SCHEMA-GUARD", "guardRoot", "MPRR-V18-GUARD"],
  [registry["machines"], "SCHEMA-MACHINE", "machineRoot", "MPRR-V18-MACHINE"],
  [registry["externalInputs"], "SCHEMA-EXTERNAL-INPUT", "inputRoot", "MPRR-V18-EXTERNAL-INPUT"]
].each do |records, schema_id, root_field, domain|
  records.each do |record|
    counters["schemaMismatch"] += 1 unless validate_record.call(record, schema_id) && core_root.call(domain, record, root_field) == record[root_field]
  end
end
schema_refs = []
collect_schema_refs = nil
collect_schema_refs = lambda do |value|
  if value.is_a?(Array)
    value.each { |item| collect_schema_refs.call(item) }
  elsif value.is_a?(Hash)
    value.each do |key, child|
      schema_refs << child if (key == "schemaId" || key.end_with?("SchemaId")) && child.is_a?(String)
      next if key == "fieldTypes"
      collect_schema_refs.call(child)
    end
  end
end
[registry, closure_rows, predecessor_rows, semantic_rows, vectors, graph].each { |value| collect_schema_refs.call(value) }
registry["schemas"].each do |schema|
  schema["fieldTypes"].values.each do |type|
    schema_refs << type.delete_prefix("object:") if type.start_with?("object:")
    schema_refs << type.delete_prefix("array<object>:") if type.start_with?("array<object>:")
  end
end
counters["unresolvedSchemaReference"] += schema_refs.count { |id| !schema_by_id.key?(id) }

findings_bytes = repository_root.join("docs/planning/three-review-protocol-v1-7-independent-hostile-review-findings-manifest-2026-08-30.md").binread
unless closure_rows.length == 25 && closure_rows.map { |row| row["sourceFindingId"] }.uniq.length == 25 && closure_rows.map { |row| row["controlId"] }.uniq.length == 25
  counters["closureMismatch"] += 1
end
control_by_id = registry["controls"].to_h { |item| [item["controlId"], item] }
vector_by_id = vectors.to_h { |item| [item["vectorId"], item] }
closure_rows.each do |row|
  good = validate_record.call(row, "SCHEMA-CLOSURE") && core_root.call("MPRR-V18-CLOSURE", row, "rowRoot") == row["rowRoot"] && row["acceptanceCredit"].zero? && row["independentReceiptState"] == "MISSING"
  selected = findings_bytes.byteslice(row["sourceByteStart"], row["sourceByteEndExclusive"] - row["sourceByteStart"])
  good &&= sha256.call(selected) == row["sourceFindingRoot"]
  good &&= control_by_id.dig(row["controlId"], "findingId") == row["sourceFindingId"] && row["vectorIds"].all? { |id| vector_by_id.key?(id) }
  counters["closureMismatch"] += 1 unless good
end

v17_closure_lines = repository_root.join("docs/planning/three-review-protocol-v1-7-package-2026-08-30/closure-crosswalk.jsonl").binread.delete_suffix("\n").split("\n")
unless predecessor_rows.length == 31 && predecessor_rows.map { |row| row["sourceFindingId"] }.uniq.length == 31
  counters["predecessorMismatch"] += 1
end
predecessor_rows.each do |row|
  line = v17_closure_lines[row["sourceLine"] - 1]
  good = validate_record.call(row, "SCHEMA-PREDECESSOR-PRESERVATION") && core_root.call("MPRR-V18-PREDECESSOR-PRESERVATION", row, "proofRoot") == row["proofRoot"] && line && sha256.call(line.b) == row["sourceRecordRoot"]
  good &&= row["successorCanonicalRecord"] == line && sha256.call(row["successorCanonicalRecord"].b) == row["successorClauseRoot"]
  good &&= row["successorClauseRoot"] == row["sourceRecordRoot"] && row["mode"] == "NORMATIVE-INCLUSION-BY-EXACT-BYTES" && row["acceptanceCredit"].zero?
  counters["predecessorMismatch"] += 1 unless good
end

semantic_sources = {}
[
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/predecessor-semantic-predicates.jsonl",
  "docs/planning/three-review-protocol-v1-7-package-2026-08-30/semantic-use-index.jsonl"
].each { |path| semantic_sources[path] = repository_root.join(path).binread.delete_suffix("\n").split("\n") }
expected_semantic_count = semantic_sources.values.sum(&:length)
seen_semantic = {}
counters["semanticMismatch"] += 1 unless semantic_rows.length == expected_semantic_count
semantic_rows.each do |row|
  lines = semantic_sources[row["sourcePath"]]
  line = lines && lines[row["sourceLine"] - 1]
  key = "#{row["sourcePath"]}##{row["sourceLine"]}"
  counters["semanticMismatch"] += 1 if seen_semantic[key]
  seen_semantic[key] = true
  good = validate_record.call(row, "SCHEMA-EXACT-SEMANTIC-PRESERVATION") && core_root.call("MPRR-V18-SEMANTIC-PRESERVATION", row, "proofRoot") == row["proofRoot"] && line && sha256.call(line.b) == row["sourceRecordRoot"]
  good &&= row["successorCanonicalRecord"] == line && sha256.call(row["successorCanonicalRecord"].b) == row["successorClauseRoot"]
  good &&= row["successorClauseRoot"] == row["sourceRecordRoot"] && row["mode"] == "NORMATIVE-INCLUSION-BY-EXACT-CANONICAL-BYTES" && row["acceptanceCredit"].zero?
  counters["semanticMismatch"] += 1 unless good
end
semantic_sources.each do |path, lines|
  lines.each_index { |index| counters["semanticMismatch"] += 1 unless seen_semantic["#{path}##{index + 1}"] }
end
semantic_proof_set_root = rooted.call("MPRR-V18-SEMANTIC-PROOF-SET", "1", *byte_sort.call(semantic_rows.map { |row| row["proofRoot"] }))
semantic_contract = registry["semanticPreservationContract"]
observed_semantic_shard_members = semantic_shard_names.each_with_index.map do |name, index|
  bytes = package_dir.join(name).binread
  rows = semantic_shard_rows[index]
  {
    "bytes" => bytes.bytesize,
    "firstProofId" => rows.first&.dig("proofId").to_s,
    "lastProofId" => rows.last&.dig("proofId").to_s,
    "lines" => line_count.call(bytes),
    "path" => logical.call(name),
    "recordCount" => rows.length,
    "root" => sha256.call(bytes),
    "sequence" => index + 1
  }
end
semantic_shard_set_root = rooted.call("MPRR-V18-SEMANTIC-SHARD-SET", "1", *semantic_contract["shardMembers"].map { |member| canonical.call(member) })
semantic_shards_valid = semantic_contract["shardMembers"].all? do |member|
  validate_record.call(member, "SCHEMA-SEMANTIC-SHARD") && member["bytes"] < public_regular_git_member_byte_limit_exclusive
end
semantic_sequence_valid = semantic_rows.each_with_index.all? do |row, index|
  row["proofId"] == "MPRR-V18-SEMANTIC-PROOF-#{(index + 1).to_s.rjust(6, "0")}"
end
unless semantic_contract["proofCount"] == semantic_rows.length && semantic_contract["proofSetRoot"] == semantic_proof_set_root && exact_set.call(semantic_contract["sourcePaths"], semantic_sources.keys) && semantic_contract["exactByteIdentityRequired"] && semantic_contract["maxShardBytesExclusive"] == public_regular_git_member_byte_limit_exclusive && semantic_contract["shardCount"] == semantic_shard_names.length && canonical.call(semantic_contract["shardMembers"]) == canonical.call(observed_semantic_shard_members) && semantic_contract["shardSetRoot"] == semantic_shard_set_root && semantic_shards_valid && semantic_sequence_valid
  counters["semanticMismatch"] += 1
end

guard_by_id = registry["guards"].to_h { |item| [item["guardId"], item] }
machine_by_id = registry["machines"].to_h { |item| [item["machineId"], item] }
model_invariant_root = rooted.call("MPRR-V18-MODEL-INVARIANT", "1", *byte_sort.call((registry["guards"] + registry["machines"]).map { |item| canonical.call(item) }))
machine_contract = registry["machineExecutionContract"]
model_invariant_clean = guard_by_id.length == registry["guards"].length && machine_by_id.length == registry["machines"].length && machine_contract["modelInvariantRoot"] == model_invariant_root && exact_set.call(machine_contract["guardIds"], guard_by_id.keys) && exact_set.call(machine_contract["machineIds"], machine_by_id.keys)
registry["machines"].each do |machine|
  transition_keys = machine["transitions"].map { |transition| "#{transition["fromState"]}\0#{transition["event"]}" }
  valid = machine["states"].uniq.length == machine["states"].length && transition_keys.uniq.length == transition_keys.length && machine["states"].include?(machine["initialState"])
  valid &&= machine["transitions"].all? do |transition|
    guard = guard_by_id[transition["guardId"]]
    base = guard && guard["event"] == transition["event"] && machine["states"].include?(transition["fromState"]) && machine["states"].include?(transition["toState"])
    terminal = (transition["event"] == "ALL_VALID" && transition["authorityEffect"] == "ELIGIBLE-NOT-ISSUED" && transition["terminal"] == "TERM-PERMIT-ELIGIBLE") || (transition["event"] == "INPUT_INVALID" && transition["authorityEffect"] == "NONE" && transition["terminal"] == "TERM-BLOCKED")
    base && terminal
  end
  unless valid
    counters["guardMismatch"] += 1
    model_invariant_clean = false
  end
end
derive_event = lambda do |context|
  next "MALFORMED" unless validate_record.call(context, "SCHEMA-GUARD-CONTEXT")
  required = %w[externalValid semanticValid independenceValid casValid publicValid timeValid]
  required.all? { |field| context[field] } ? "ALL_VALID" : "INPUT_INVALID"
end
execute_machine = lambda do |machine_id, state, context|
  machine = machine_by_id[machine_id]
  next({ "terminal" => "TERM-MALFORMED", "event" => "MALFORMED" }) unless machine && machine["states"].include?(state)
  event = derive_event.call(context)
  candidates = machine["transitions"].select { |transition| transition["fromState"] == state && transition["event"] == event }
  next({ "terminal" => "TERM-MALFORMED", "event" => event }) unless candidates.length == 1
  transition = candidates.first
  guard = guard_by_id[transition["guardId"]]
  guard_pass = guard && guard["event"] == event && guard["requiredTrueFields"].all? { |field| context[field] == true }
  guard_pass ? { "terminal" => transition["terminal"], "event" => event, "toState" => transition["toState"] } : { "terminal" => "TERM-GUARD-REJECTED", "event" => event }
end
all_true_exhaustive = { "casValid" => true, "externalValid" => true, "independenceValid" => true, "publicValid" => true, "semanticValid" => true, "timeValid" => true }
exhaustive_contexts = [all_true_exhaustive] + %w[casValid externalValid independenceValid publicValid semanticValid timeValid].map { |field| all_true_exhaustive.merge(field => false) }
exhaustive_terminals = exhaustive_contexts.map { |context| execute_machine.call("MPRR-V18-MACHINE-ACCEPTANCE", "PENDING", context)["terminal"] }
unless machine_contract["exhaustiveContextCount"] == exhaustive_contexts.length && exhaustive_terminals.first == "TERM-PERMIT-ELIGIBLE" && exhaustive_terminals.drop(1).all? { |terminal| terminal == "TERM-BLOCKED" }
  counters["guardMismatch"] += 1
  model_invariant_clean = false
end

derive_acceptance = lambda do |snapshot, authority_adapter_present = false|
  principals = snapshot.fetch("principals", [])
  unique = principals.length >= 7 && principals.uniq.length == principals.length
  producer_principals = snapshot.fetch("producerPrincipals", [])
  reviewer_principals = snapshot.fetch("reviewerPrincipals", [])
  separated = unique && producer_principals.none? { |root| reviewer_principals.include?(root) || root == snapshot["acceptorPrincipal"] }
  receipt_roots = snapshot.fetch("receiptPackageRoots", [])
  roots_bound = !receipt_roots.empty? && receipt_roots.all? { |root| root == snapshot["packageRoot"] }
  fields = %w[closureComplete externalReceiptsValid semanticReceiptValid casCommitted publicInvariant timeFresh finalityValid]
  eligible = fields.all? { |field| snapshot[field] == true } && unique && separated && roots_bound
  authoritative = eligible && snapshot["executionMode"] == "AUTHORITATIVE" && authority_adapter_present
  { "Acceptance" => authoritative ? 1 : 0, "Gate29" => eligible ? "PERMIT-ELIGIBLE-NOT-ISSUED" : "BLOCKED", "authorityOutputs" => authoritative ? 1 : 0, "permitEligible" => eligible }
end
current_snapshot = {
  "acceptorPrincipal" => nil,
  "casCommitted" => false,
  "closureComplete" => closure_rows.all? { |row| row["acceptanceCredit"] == 1 },
  "executionMode" => "NON-AUTHORITATIVE-QA",
  "externalReceiptsValid" => registry["externalInputs"].all? { |item| item["state"] == "VALID" },
  "finalityValid" => false,
  "packageRoot" => manifest["packageRoot"],
  "principals" => [],
  "producerPrincipals" => [],
  "publicInvariant" => false,
  "receiptPackageRoots" => [],
  "reviewerPrincipals" => [],
  "semanticReceiptValid" => false,
  "timeFresh" => false
}
derived_authority = derive_acceptance.call(current_snapshot, registry["acceptanceContract"]["authorityAdapterPresent"])
semantic_external = registry["externalInputs"].find { |item| item["inputId"] == "EXT-INDEPENDENT-SEMANTIC-RECEIPT" }
expected_authority = {
  "Acceptance" => derived_authority["Acceptance"],
  "Gate29" => derived_authority["Gate29"] == "PERMIT-ELIGIBLE-NOT-ISSUED" ? "BLOCKED" : derived_authority["Gate29"],
  "authorityOutputs" => derived_authority["authorityOutputs"],
  "developmentFreeze" => registry["governance"]["freezeRequired"] ? "ACTIVE" : "INACTIVE",
  "independentReceipt" => semantic_external && semantic_external["state"] == "VALID" ? "VALID" : "MISSING-EXTERNAL-INPUT",
  "repository" => registry["publicInvariant"]["requiredVisibility"]
}
counters["authorityMismatch"] += 1 unless canonical.call(expected_authority) == canonical.call(registry["authorityState"]) && canonical.call(expected_authority) == canonical.call(manifest["authorityState"])

canonical_conforms = lambda do |raw|
  begin
    canonical.call(JSON.parse(raw)) == raw
  rescue StandardError
    false
  end
end
resolve_evidence_path = lambda do |record, path|
  path.split(".").reduce(record) { |value, segment| value.is_a?(Hash) && value.key?(segment) ? value[segment] : nil }
end
evaluate = lambda do |input, context|
  terminal = "TERM-MALFORMED"
  permit_eligible = false
  case input["operation"]
  when "PREDECESSOR_VECTOR_INTEGRITY"
    lines = repository_root.join(input["sourcePath"]).binread.delete_suffix("\n").split("\n")
    original = (lines[input["sourceLine"] - 1] || "").b
    mutated = original.dup
    if sha256.call(original) == input["baselineRoot"] && input["mutationOffset"] >= 0 && input["mutationOffset"] < mutated.bytesize
      mutated.setbyte(input["mutationOffset"], mutated.getbyte(input["mutationOffset"]) ^ input["xorMask"])
      terminal = sha256.call(mutated) != sha256.call(original) ? "TERM-SOURCE-MUTATION-DETECTED" : "TERM-MALFORMED"
    end
  when "PACKAGE_ROOT_CHECK"
    root = rooted.call("MPRR-V18-NORMATIVE-PACKAGE", "1", *byte_sort.call(input["payloadRecords"]), *input["toolRoots"])
    terminal = root == input["declaredRoot"] ? "TERM-MECHANICAL-CLEAN" : "TERM-PACKAGE-INVALID"
  when "PARSER_REDISCOVERY"
    terminal = input["declaredRediscoveryRoot"] == parser_rediscovery_set_root ? "TERM-MECHANICAL-CLEAN" : "TERM-PARSER-INVALID"
  when "TOOL_ROOT_CHECK"
    terminal = sha256.call(repository_root.join(input["path"]).binread) == input["declaredRoot"] ? "TERM-MECHANICAL-CLEAN" : "TERM-TOOL-INVALID"
  when "SET_EQUALITY"
    terminal = exact_set.call(input["expected"], input["actual"]) ? "TERM-MECHANICAL-CLEAN" : "TERM-UNIVERSE-INVALID"
  when "REPOSITORY_IDENTITY"
    terminal = context["rootRealpathStable"] && context["gitOrigin"] == input["expectedOrigin"] && context["gitStateRoot"] == input["expectedGitStateRoot"] ? "TERM-MECHANICAL-CLEAN" : "TERM-REPOSITORY-INVALID"
  when "SCHEMA_RECORD"
    terminal = validate_record.call(input["record"], input["schemaId"]) ? "TERM-MECHANICAL-CLEAN" : "TERM-SCHEMA-INVALID"
  when "SCHEMA_REFERENCES"
    terminal = input["references"].all? { |id| schema_by_id.key?(id) } ? "TERM-MECHANICAL-CLEAN" : "TERM-SCHEMA-INVALID"
  when "CANONICAL_JSON"
    terminal = canonical_conforms.call(input["rawJson"]) ? "TERM-MECHANICAL-CLEAN" : "TERM-CANONICAL-INVALID"
  when "ENVELOPE_ROOT"
    terminal = rooted.call("MPRR-V18-OUTPUT-ENVELOPE", "1", canonical.call(input["envelope"])) == input["declaredRoot"] ? "TERM-MECHANICAL-CLEAN" : "TERM-ENVELOPE-INVALID"
  when "DETACHED_PACKAGE_BINDING"
    good = validate_record.call(input["expectedEnvelope"], "SCHEMA-DETACHED-EVIDENCE") && validate_record.call(input["receiptEnvelope"], "SCHEMA-DETACHED-EVIDENCE") && canonical.call(input["expectedEnvelope"]) == canonical.call(input["receiptEnvelope"])
    terminal = good ? "TERM-MECHANICAL-CLEAN" : "TERM-BINDING-INVALID"
  when "BINDING_PATHS"
    good = !input["bindings"].empty? && input["bindings"].all? do |item|
      left = resolve_evidence_path.call(input["evidence"], item["leftPath"])
      right = resolve_evidence_path.call(input["evidence"], item["rightPath"])
      item["operator"] == "CANONICAL-STRICT-EQUALS" && item["multiplicity"] == "EXACTLY-ONE" && !left.nil? && canonical.call(left) == canonical.call(right)
    end
    terminal = good ? "TERM-MECHANICAL-CLEAN" : "TERM-BINDING-INVALID"
  when "SEMANTIC_IDENTITY"
    good = input["mode"] == "NORMATIVE-INCLUSION-BY-EXACT-CANONICAL-BYTES" && input["sourceRoot"] == input["targetRoot"]
    terminal = good ? "TERM-MECHANICAL-CLEAN" : "TERM-SEMANTIC-INVALID"
  when "BYTE_MUTATION"
    original = [input["bytesHex"]].pack("H*")
    mutated = original.dup
    if input["offset"] >= 0 && input["offset"] < mutated.bytesize
      mutated.setbyte(input["offset"], mutated.getbyte(input["offset"]) ^ input["xorMask"])
    end
    terminal = sha256.call(original) != sha256.call(mutated) ? "TERM-SOURCE-MUTATION-DETECTED" : "TERM-MALFORMED"
  when "GRAPH_COVERAGE"
    terminal = exact_set.call(input["vectorIds"], input["graphVectorIds"]) && input["oracleToEvaluatorEdges"].zero? ? "TERM-MECHANICAL-CLEAN" : "TERM-GRAPH-INVALID"
  when "MACHINE_STEP"
    terminal = execute_machine.call(input["machineId"], input["state"], input["context"])["terminal"]
  when "EVENT_DERIVATION"
    event = derive_event.call(input["context"])
    terminal = event == "ALL_VALID" ? "TERM-EVENT-DERIVED" : event == "INPUT_INVALID" ? "TERM-INPUT-INVALID" : "TERM-MALFORMED"
  when "MODEL_INVARIANT"
    terminal = model_invariant_clean && input["declaredModelInvariantRoot"] == model_invariant_root ? "TERM-MECHANICAL-CLEAN" : "TERM-MODEL-INVALID"
  when "AUTHORITY_DERIVATION", "ACCEPTANCE_DERIVATION"
    actual = derive_acceptance.call(input["snapshot"], false)
    permit_eligible = actual["permitEligible"]
    if input["operation"] == "AUTHORITY_DERIVATION"
      terminal = actual["Acceptance"] == input["claimedAcceptance"] && actual["authorityOutputs"] == input["claimedAuthorityOutputs"] ? "TERM-MECHANICAL-CLEAN" : "TERM-AUTHORITY-MISMATCH"
    else
      terminal = actual["permitEligible"] ? "TERM-PERMIT-ELIGIBLE" : "TERM-BLOCKED"
    end
  when "NO_SELF_ACCEPTANCE"
    actual = derive_acceptance.call(input["snapshot"], false)
    permit_eligible = actual["permitEligible"]
    safe = actual["permitEligible"] && actual["Acceptance"].zero? && actual["authorityOutputs"].zero? && !registry["acceptanceContract"]["authorityAdapterPresent"] && registry["acceptanceContract"]["noSelfAcceptance"]
    terminal = safe ? "TERM-NO-SELF-ACCEPTANCE" : "TERM-AUTHORITY-MISMATCH"
  when "AUTHORITY_STATE_CHECK"
    terminal = validate_record.call(input["claimedState"], "SCHEMA-AUTHORITY-STATE") && canonical.call(input["claimedState"]) == canonical.call(expected_authority) ? "TERM-MECHANICAL-CLEAN" : "TERM-AUTHORITY-MISMATCH"
  when "CAS_TRANSACTION"
    comparison_ids = input["comparisons"].map { |item| item["comparisonId"] }
    heads_match = exact_set.call(comparison_ids, registry["casContract"]["comparisonMemberIds"]) && input["comparisons"].length == 65 && input["comparisons"].all? { |item| item["expectedRoot"] == item["observedRoot"] && item["revocationFresh"] && !item["revoked"] }
    durable_set_valid = exact_set.call(input["durableWriteIds"], registry["casContract"]["durableMemberIds"])
    if !heads_match
      terminal = input["durableWriteIds"].empty? && input["permitCount"].zero? ? "TERM-CAS-ABORTED" : "TERM-RECOVERY-INVALID"
    elsif input["crashPoint"] == "BEFORE-COMMIT"
      terminal = "TERM-RECOVERED-NO-WRITE"
    elsif !durable_set_valid || input["permitCount"] > 1
      terminal = "TERM-RECOVERY-INVALID"
    elsif input["crashPoint"] == "AFTER-COMMIT-BEFORE-RESPONSE"
      terminal = input["receiptDurable"] ? "TERM-RECOVERED-EXACT-RECEIPT" : "TERM-RECOVERY-INVALID"
    else
      terminal = input["receiptDurable"] && input["permitCount"] == 1 && input["readbackMatches"] ? "TERM-COMMITTED" : "TERM-REVOKED"
    end
  when "RECOVERY_SCHEDULE"
    full_commit = exact_set.call(input["committedMemberIds"], registry["recoveryContract"]["durableMemberIds"])
    no_commit = input["committedMemberIds"].empty?
    if !registry["recoveryContract"]["crashPoints"].include?(input["crashPoint"])
      terminal = "TERM-RECOVERY-INVALID"
    elsif %w[BEFORE-COMPARE AFTER-COMPARE-BEFORE-COMMIT].include?(input["crashPoint"])
      terminal = no_commit ? "TERM-RECOVERED-NO-WRITE" : "TERM-RECOVERY-INVALID"
    elsif !full_commit
      terminal = "TERM-RECOVERY-INVALID"
    elsif input["crashPoint"] == "AFTER-COMMIT-BEFORE-RESPONSE"
      terminal = input["exactReceiptAvailable"] ? "TERM-RECOVERED-EXACT-RECEIPT" : "TERM-RECOVERY-INVALID"
    else
      terminal = input["exactReceiptAvailable"] && input["revocationConsumed"] ? "TERM-REVOKED" : "TERM-RECOVERY-INVALID"
    end
  when "EXTERNAL_EVIDENCE"
    receipt_core = input["receipt"].reject { |key, _| %w[receiptRoot signatureRoot].include?(key) }
    computed_receipt_root = rooted.call("MPRR-V18-EXTERNAL-RECEIPT", "1", canonical.call(receipt_core))
    computed_signature_root = rooted.call("MPRR-V18-REFERENCE-SIGNATURE", "1", input.dig("receipt", "issuerRoot"), computed_receipt_root)
    receipt = input["receipt"]
    good = validate_record.call(receipt, "SCHEMA-EXTERNAL-RECEIPT") && receipt["receiptRoot"] == computed_receipt_root && receipt["signatureRoot"] == computed_signature_root && input["trustedIssuerRoots"].include?(receipt["issuerRoot"])
    good &&= receipt["fresh"] && !receipt["revoked"] && receipt["packageRoot"] == input["expectedPackageRoot"] && receipt["manifestRoot"] == input["expectedManifestRoot"] && receipt["subjectRoot"] == input["expectedSubjectRoot"] && receipt["audience"] == input["expectedAudience"] && receipt["purpose"] == input["expectedPurpose"]
    terminal = good ? "TERM-MECHANICAL-CLEAN" : "TERM-EXTERNAL-INVALID"
  when "PUBLIC_INVARIANT"
    transaction_core = input["transaction"].reject { |key, _| key == "transactionRoot" }
    write_object_set_root = rooted.call("MPRR-V18-WRITE-OBJECT-SET", "1", *byte_sort.call(input.dig("transaction", "writeObjectRoots")))
    computed_transaction_root = rooted.call("MPRR-V18-PUSH-TRANSACTION", "1", canonical.call(transaction_core))
    receipts = input["scannerReceipts"]
    receipts_valid = receipts.length == 2 && receipts.map { |item| item["scannerId"] }.uniq.length == 2 && receipts.map { |item| item["scannerRoot"] }.uniq.length == 2 && receipts.map { |item| item["dictionarySealRoot"] }.uniq.length == 1
    receipts_valid &&= receipts.all? do |item|
      receipt_core = item.reject { |key, _| key == "receiptRoot" }
      item["receiptRoot"] == rooted.call("MPRR-V18-SCANNER-RECEIPT", "1", canonical.call(receipt_core)) && item["transactionRoot"] == input.dig("transaction", "transactionRoot") && item["clean"] && item["candidateCount"].zero?
    end
    good = input["requiredVisibility"] == "PUBLIC" && input["observedVisibility"] == "PUBLIC" && input.dig("transaction", "transactionRoot") == computed_transaction_root && input.dig("transaction", "writeObjectSetRoot") == write_object_set_root && input.dig("transaction", "writeObjectRoots").uniq.length == input.dig("transaction", "writeObjectRoots").length && receipts_valid
    terminal = good ? "TERM-MECHANICAL-CLEAN" : "TERM-PUBLIC-UNSAFE"
  when "DEPENDENCY_HEADS"
    expected_ids = registry["casContract"]["comparisonMemberIds"].select { |item| item.match?(/\ACAS-DEPENDENCY-\d{3}\z/) }
    good = expected_ids.length == 32 && exact_set.call(input["dependencies"].map { |item| item["memberId"] }, expected_ids) && input["dependencies"].all? { |item| item["readCount"] == 1 && item["expectedRoot"] == item["observedRoot"] && item["revocationFresh"] && !item["revoked"] }
    terminal = good ? "TERM-MECHANICAL-CLEAN" : "TERM-DEPENDENCY-STALE"
  when "READER_OUTPUT_MODE"
    good = input["defaultMode"] == "READ-ONLY" && (!input["writeRequested"] || input["explicitDetachedOutput"])
    terminal = good ? "TERM-MECHANICAL-CLEAN" : "TERM-READER-MUTATION-RISK"
  end
  authority_outputs = permit_eligible && input["executionMode"] == "AUTHORITATIVE" && context["authorityAdapterPresent"] ? 1 : 0
  {
    "authorityOutputs" => authority_outputs,
    "permitEligible" => permit_eligible,
    "stateRoot" => rooted.call("MPRR-V18-ACTUAL-RESULT", "1", terminal, permit_eligible.to_s, authority_outputs.to_s),
    "terminal" => terminal
  }
end

vector_results = []
vectors.each do |vector|
  good = validate_record.call(vector, "SCHEMA-VECTOR") && validate_record.call(vector["input"], vector["inputSchemaId"]) && validate_record.call(vector["oracle"], vector["oracleSchemaId"]) && core_root.call("MPRR-V18-VECTOR", vector, "vectorRoot") == vector["vectorRoot"]
  good &&= rooted.call("MPRR-V18-VECTOR-INPUT", "1", canonical.call(vector["input"])) == vector["inputRoot"]
  good &&= rooted.call("MPRR-V18-VECTOR-ORACLE", "1", canonical.call(vector["oracle"])) == vector["oracleRoot"]
  unless good
    counters["vectorMismatch"] += 1
    next
  end
  copied_input = Marshal.load(Marshal.dump(vector["input"]))
  evaluation_context = { "authorityAdapterPresent" => registry["acceptanceContract"]["authorityAdapterPresent"], "gitOrigin" => git_origin.strip, "gitStateRoot" => observed_git_state_root, "repositoryRoot" => repository_root.to_s, "rootRealpathStable" => git_top == repository_root }
  actual = evaluate.call(copied_input, evaluation_context)
  mutated_oracle = vector["oracle"].merge("terminal" => "#{vector["oracle"]["terminal"]}-ORACLE-MUTATION")
  metamorphic_actual = evaluate.call(Marshal.load(Marshal.dump(vector["input"])), evaluation_context)
  counters["vectorMismatch"] += 1 if mutated_oracle["terminal"] == vector["oracle"]["terminal"] || canonical.call(metamorphic_actual) != canonical.call(actual)
  oracle = vector["oracle"]
  counters["vectorMismatch"] += 1 unless actual["terminal"] == oracle["terminal"] && actual["permitEligible"] == oracle["permitEligible"] && actual["authorityOutputs"] == oracle["authorityOutputs"]
  vector_results << { "actual" => actual, "vectorId" => vector["vectorId"] }
end

node_ids = graph["nodes"].map { |node| node["nodeId"] }
edge_ids = graph["edges"].map { |edge| edge["edgeId"] }
good_graph = validate_record.call(graph, "SCHEMA-GRAPH") && graph["nodeCount"] == graph["nodes"].length && graph["edgeCount"] == graph["edges"].length
good_graph &&= node_ids.uniq.length == node_ids.length && edge_ids.uniq.length == edge_ids.length && core_root.call("MPRR-V18-CAUSAL-GRAPH", graph, "graphRoot") == graph["graphRoot"]
counters["graphMismatch"] += 1 unless good_graph
graph_vector_ids = graph["nodes"].select { |node| node["nodeType"] == "RAW-INPUT" }.map { |node| node["vectorId"] }.uniq
counters["graphMismatch"] += 1 unless exact_set.call(graph_vector_ids, vectors.map { |vector| vector["vectorId"] })
allowed_relations = %w[INPUT-TO-EVALUATOR EVALUATOR-TO-ACTUAL ACTUAL-TO-COMPARISON ORACLE-TO-COMPARISON]
counters["graphMismatch"] += 1 unless canonical.call(graph["requiredOrder"]) == canonical.call(allowed_relations)
graph["edges"].each do |edge|
  counters["graphMismatch"] += 1 unless allowed_relations.include?(edge["relation"]) && node_ids.include?(edge["from"]) && node_ids.include?(edge["to"])
end
actual_by_vector_id = vector_results.to_h { |item| [item["vectorId"], item["actual"]] }
vectors.each do |vector|
  prefix = "#{vector["vectorId"]}:"
  nodes = graph["nodes"].select { |node| node["vectorId"] == vector["vectorId"] }
  edges = graph["edges"].select { |edge| edge["vectorId"] == vector["vectorId"] }
  types = nodes.map { |node| node["nodeType"] }
  expected_types = %w[RAW-INPUT EVALUATOR ACTUAL-RESULT EXPECTED-ORACLE POST-EXECUTION-COMPARISON]
  actual_root = actual_by_vector_id.dig(vector["vectorId"], "stateRoot").to_s
  comparison_root = rooted.call("MPRR-V18-POST-EXECUTION-COMPARISON", "1", actual_root, vector["oracleRoot"])
  expected_nodes = [
    { "nodeId" => "#{prefix}INPUT", "nodeType" => "RAW-INPUT", "root" => vector["inputRoot"], "vectorId" => vector["vectorId"] },
    { "nodeId" => "#{prefix}EVALUATOR", "nodeType" => "EVALUATOR", "root" => label_root.call("EVALUATOR:#{vector.dig("input", "operation")}"), "vectorId" => vector["vectorId"] },
    { "nodeId" => "#{prefix}ACTUAL", "nodeType" => "ACTUAL-RESULT", "root" => actual_root, "vectorId" => vector["vectorId"] },
    { "nodeId" => "#{prefix}ORACLE", "nodeType" => "EXPECTED-ORACLE", "root" => vector["oracleRoot"], "vectorId" => vector["vectorId"] },
    { "nodeId" => "#{prefix}COMPARE", "nodeType" => "POST-EXECUTION-COMPARISON", "root" => comparison_root, "vectorId" => vector["vectorId"] }
  ]
  expected_edges = [
    { "edgeId" => "#{vector["vectorId"]}:EDGE-1", "from" => "#{prefix}INPUT", "relation" => "INPUT-TO-EVALUATOR", "to" => "#{prefix}EVALUATOR", "vectorId" => vector["vectorId"] },
    { "edgeId" => "#{vector["vectorId"]}:EDGE-2", "from" => "#{prefix}EVALUATOR", "relation" => "EVALUATOR-TO-ACTUAL", "to" => "#{prefix}ACTUAL", "vectorId" => vector["vectorId"] },
    { "edgeId" => "#{vector["vectorId"]}:EDGE-3", "from" => "#{prefix}ACTUAL", "relation" => "ACTUAL-TO-COMPARISON", "to" => "#{prefix}COMPARE", "vectorId" => vector["vectorId"] },
    { "edgeId" => "#{vector["vectorId"]}:EDGE-4", "from" => "#{prefix}ORACLE", "relation" => "ORACLE-TO-COMPARISON", "to" => "#{prefix}COMPARE", "vectorId" => vector["vectorId"] }
  ]
  bad = nodes.length != 5 || edges.length != 4 || !exact_set.call(types, expected_types) || !exact_set.call(nodes.map { |item| canonical.call(item) }, expected_nodes.map { |item| canonical.call(item) }) || !exact_set.call(edges.map { |item| canonical.call(item) }, expected_edges.map { |item| canonical.call(item) })
  counters["graphMismatch"] += 1 if bad
end

computed_cas_comparison_set_root = rooted.call("MPRR-V18-CAS-COMPARISON-ID-SET", "1", *byte_sort.call(registry["casContract"]["comparisonMemberIds"]))
computed_cas_durable_set_root = rooted.call("MPRR-V18-CAS-DURABLE-MEMBER-ID-SET", "1", *byte_sort.call(registry["casContract"]["durableMemberIds"]))
cas_static_valid = registry["casContract"]["referenceEvaluatorExecutable"] && !registry["casContract"]["productionAdapterExecutable"] && registry["casContract"]["currentAdmissionState"] == "BLOCKED-MISSING-EXTERNAL-HEADS"
cas_static_valid &&= registry["casContract"]["comparisonMemberIds"].length == 65 && registry["casContract"]["comparisonMemberIds"].uniq.length == 65 && registry["casContract"]["durableMemberIds"].length == 17 && registry["casContract"]["durableMemberIds"].uniq.length == 17
cas_static_valid &&= registry["casContract"]["comparisonSetRoot"] == computed_cas_comparison_set_root && registry["casContract"]["durableMemberSetRoot"] == computed_cas_durable_set_root
cas_static_valid &&= registry["recoveryContract"]["referenceEvaluatorExecutable"] && !registry["recoveryContract"]["productionAdapterExecutable"] && exact_set.call(registry["recoveryContract"]["durableMemberIds"], registry["casContract"]["durableMemberIds"]) && registry["recoveryContract"]["crashPoints"].length == 5
unless cas_static_valid
  counters["casMismatch"] += 1
end
unless registry["publicInvariant"]["requiredVisibility"] == "PUBLIC" && registry["publicInvariant"]["requiredScannerCount"] == 2 && registry["publicInvariant"]["currentContinuousReceiptState"] == "MISSING-EXTERNAL-INPUT"
  counters["publicMismatch"] += 1
end
immutable_reader_snapshot.each do |path, before|
  bytes = Pathname.new(path).binread
  counters["readerMutationMismatch"] += 1 unless "#{sha256.call(bytes)}:#{bytes.bytesize}" == before
end

status = counters.values.all?(&:zero?) ? "PASS" : "FAIL"
vector_result_set_root = rooted.call("MPRR-V18-VECTOR-RESULT-SET", "1", *byte_sort.call(vector_results.map { |result| canonical.call(result) }))
common_result_root = rooted.call("MPRR-V18-COMMON-QA-RESULT", "1", computed_package_root, canonical.call(counters), vector_result_set_root, canonical.call(expected_authority))
report = expected_authority.merge(
  "commonResultRoot" => common_result_root,
  "counters" => counters,
  "manifestRoot" => sha256.call(package_dir.join("normative-package-manifest.json").binread),
  "packageRoot" => computed_package_root,
  "readerId" => "MPRR-V18-READER-B",
  "readerKind" => "INDEPENDENT-MECHANICAL;NON-AUTHORITATIVE",
  "status" => status,
  "vectorResultSetRoot" => vector_result_set_root,
  "verifiedCounts" => {
    "closureRows" => closure_rows.length,
    "frozenInputs" => manifest["frozenInputs"].length,
    "graphEdges" => graph["edges"].length,
    "graphNodes" => graph["nodes"].length,
    "predecessorFindingRows" => predecessor_rows.length,
    "schemas" => registry["schemas"].length,
    "semanticPreservationRows" => semantic_rows.length,
    "vectors" => vectors.length
  }
)
if report_path
  report_path.binwrite("#{canonical.call(report)}\n")
else
  $stdout.write("#{canonical.call(report)}\n")
end
exit(1) unless status == "PASS"
