CREATE TABLE `meta_credential_envelopes` (
	`tenant_id` integer PRIMARY KEY NOT NULL,
	`key_version` text NOT NULL,
	`initialization_vector` text NOT NULL,
	`ciphertext` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "meta_credential_envelopes_key_version_valid" CHECK("meta_credential_envelopes"."key_version" = 'v1'),
	CONSTRAINT "meta_credential_envelopes_iv_base64" CHECK(length("meta_credential_envelopes"."initialization_vector") = 16
        and "meta_credential_envelopes"."initialization_vector" not glob '*[^A-Za-z0-9+/]*'),
	CONSTRAINT "meta_credential_envelopes_ciphertext_bounded" CHECK(length("meta_credential_envelopes"."ciphertext") between 24 and 12000
        and "meta_credential_envelopes"."ciphertext" not glob '*[^A-Za-z0-9+/=]*')
);
