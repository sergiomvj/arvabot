-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.agent_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  openclaw_id text NOT NULL,
  status text DEFAULT 'offline'::text,
  last_seen timestamp with time zone,
  tasks_pending integer DEFAULT 0,
  tasks_done integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agent_status_pkey PRIMARY KEY (id),
  CONSTRAINT agent_status_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.agents_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  openclaw_id text NOT NULL,
  name text NOT NULL,
  role text,
  career text,
  model text,
  color text DEFAULT '#10B981'::text,
  active boolean DEFAULT true,
  skills ARRAY,
  last_synced_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT agents_cache_pkey PRIMARY KEY (id),
  CONSTRAINT agents_cache_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.agent_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  agent_id text NOT NULL,
  user_identifier text NOT NULL,
  theme text NOT NULL,
  context text NOT NULL,
  channel text,
  status text NOT NULL DEFAULT 'active'::text,
  last_interaction timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_threads_pkey PRIMARY KEY (id),
  CONSTRAINT agent_threads_organization_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT agent_threads_agent_fkey FOREIGN KEY (organization_id, agent_id) REFERENCES public.agents_cache(organization_id, openclaw_id) ON DELETE CASCADE
);
CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  email text NOT NULL,
  role text DEFAULT 'member'::text,
  token text NOT NULL DEFAULT (gen_random_uuid())::text UNIQUE,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  created_by uuid,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invitations_pkey PRIMARY KEY (id),
  CONSTRAINT invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  user_id uuid,
  role text DEFAULT 'member'::text,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organization_members_pkey PRIMARY KEY (id),
  CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  plan text DEFAULT 'starter'::text,
  logo_url text,
  primary_color text DEFAULT '#10B981'::text,
  openclaw_api_key text,
  openclaw_url text DEFAULT 'https://dashboard.fbrapps.com'::text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  avatar_url text,
  current_org_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_current_org_id_fkey FOREIGN KEY (current_org_id) REFERENCES public.organizations(id)
);

CREATE UNIQUE INDEX agents_cache_organization_id_openclaw_id_key ON public.agents_cache(organization_id, openclaw_id);
CREATE UNIQUE INDEX agent_status_organization_id_openclaw_id_key ON public.agent_status(organization_id, openclaw_id);
CREATE UNIQUE INDEX organization_members_organization_id_user_id_key ON public.organization_members(organization_id, user_id);
CREATE UNIQUE INDEX organizations_slug_key ON public.organizations(slug);
CREATE UNIQUE INDEX invitations_token_key ON public.invitations(token);

CREATE INDEX organization_members_user_id_idx ON public.organization_members(user_id);
CREATE INDEX profiles_current_org_id_idx ON public.profiles(current_org_id);
CREATE INDEX agents_cache_org_active_idx ON public.agents_cache(organization_id, active);
CREATE INDEX agents_cache_org_last_synced_idx ON public.agents_cache(organization_id, last_synced_at);
CREATE INDEX agent_status_org_status_idx ON public.agent_status(organization_id, status);
CREATE INDEX agent_status_org_updated_idx ON public.agent_status(organization_id, updated_at);
CREATE INDEX invitations_org_email_idx ON public.invitations(organization_id, email);
CREATE INDEX invitations_expires_at_idx ON public.invitations(expires_at);
CREATE INDEX agent_threads_org_agent_user_status_interaction_idx ON public.agent_threads(organization_id, agent_id, user_identifier, status, last_interaction);
CREATE INDEX agent_threads_org_agent_status_interaction_idx ON public.agent_threads(organization_id, agent_id, status, last_interaction);
CREATE INDEX agent_threads_org_status_interaction_idx ON public.agent_threads(organization_id, status, last_interaction);
