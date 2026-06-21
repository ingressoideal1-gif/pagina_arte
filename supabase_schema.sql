-- Script de Criação de Banco de Dados Exclusivo
-- Projeto Supabase: ferumcflobtwjfxyoeng
-- Aplicativo: ERP Ideal - Recebedor de Arquivos

-- 1. Tabela Principal de Eventos/Lotes
CREATE TABLE IF NOT EXISTS public.app_upload_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    event_date text NOT NULL,
    event_time text NOT NULL,
    event_location text NOT NULL,
    designer_name text,
    status text DEFAULT 'pendente'
);

-- 2. Tabela para Observações (Rich Text)
-- Relacionada ao Evento (1 Evento pode ter várias observações)
CREATE TABLE IF NOT EXISTS public.app_upload_observations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid REFERENCES public.app_upload_events(id) ON DELETE CASCADE,
    content text NOT NULL, -- O HTML gerado pelo editor Quill
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela para Arquivos Anexados
-- Relacionada ao Evento (1 Evento pode ter vários arquivos)
CREATE TABLE IF NOT EXISTS public.app_upload_files (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid REFERENCES public.app_upload_events(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    file_size bigint NOT NULL,
    storage_path text, -- Caminho no Supabase Storage se você for fazer o upload físico do arquivo
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de Segurança (Row Level Security) - Básicas para permitir INSERT anônimo/público inicial
-- ATENÇÃO: Em produção, ajuste o RLS para exigir autenticação caso seu ERP exija login.
ALTER TABLE public.app_upload_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_upload_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_upload_files ENABLE ROW LEVEL SECURITY;

-- Permitir leitura e escrita pública temporária (ajuste conforme a necessidade de segurança do projeto)
CREATE POLICY "Permitir Tudo Publico Events" ON public.app_upload_events FOR ALL USING (true);
CREATE POLICY "Permitir Tudo Publico Observations" ON public.app_upload_observations FOR ALL USING (true);
CREATE POLICY "Permitir Tudo Publico Files" ON public.app_upload_files FOR ALL USING (true);
