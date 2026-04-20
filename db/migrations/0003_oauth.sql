-- OAuth 2.1 tables powering the Authorization Server that fronts the
-- MCP Streamable HTTP endpoint at /mcp. Clients (Claude.ai, Claude Code,
-- etc.) register dynamically, go through PKCE-backed auth-code flow, and
-- exchange codes for bearer tokens scoped to 'mcp'.

create table if not exists oauth_clients (
  client_id                  text primary key,
  client_secret              text,
  client_name                text,
  redirect_uris              text[] not null default '{}',
  token_endpoint_auth_method text not null default 'none',
  created_at                 timestamptz default now()
);

create table if not exists oauth_auth_codes (
  code                   text primary key,
  client_id              text not null references oauth_clients(client_id) on delete cascade,
  redirect_uri           text not null,
  code_challenge         text not null,
  code_challenge_method  text not null default 'S256',
  scope                  text not null default 'mcp',
  expires_at             timestamptz not null,
  used                   boolean not null default false,
  created_at             timestamptz default now()
);
create index if not exists idx_oauth_auth_codes_client on oauth_auth_codes(client_id);
create index if not exists idx_oauth_auth_codes_expires on oauth_auth_codes(expires_at);

create table if not exists oauth_tokens (
  token       text primary key,
  client_id   text not null references oauth_clients(client_id) on delete cascade,
  scope       text not null default 'mcp',
  expires_at  timestamptz not null,
  revoked     boolean not null default false,
  created_at  timestamptz default now()
);
create index if not exists idx_oauth_tokens_client on oauth_tokens(client_id);
create index if not exists idx_oauth_tokens_expires on oauth_tokens(expires_at);

alter table oauth_clients    enable row level security;
alter table oauth_auth_codes enable row level security;
alter table oauth_tokens     enable row level security;
