# Optional company mailbox adapter

The company-mail connector is reusable and disabled unless the installation explicitly enables it. Configure an approved IMAPS host and email domain in `connectors.companyMail`; use a dedicated, reviewed network allowlist. Never infer the host from an employee-supplied address.

Credentials are personal and encrypted server-side. Catalog grants, current identity and operation permissions govern each request. Imported documents remain in the authorized employee/project scope; mailbox access does not grant company-wide publication.

Invoice extraction and tracking are optional business workflows over this connector, not a requirement for using the brain. Reading/importing and sending or modifying mail have different permissions; background execution needs durable authorization and verified provider readback.

Provision separate credentials and verify authentication, isolation, credential revocation, message deduplication, attachment limits, failure recovery and backups in the intended installation. Examples must use `mail.example.invalid` and fictional accounts. No real mailbox connection is claimed by this codebase.
