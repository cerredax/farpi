-- Un documento puede caducar.
--
-- El DNI, el pasaporte, el seguro, la ITV, la tarjeta sanitaria. Una carpeta
-- familiar que no avisa de lo que vence sirve para guardar, no para recordar, y
-- lo segundo es la mitad de por qué existe. El aviso diario del cron ya está
-- montado: solo le faltaba esta fecha que mirar.
--
-- Nullable a propósito: la mayoría de los documentos no caducan (una factura,
-- un informe), y obligar a poner fecha convertiría el alta en un interrogatorio.

alter table public.documents
  add column if not exists expires_on date;

-- Se consulta "lo que caduca pronto" en toda la familia, ordenado por fecha.
create index if not exists idx_documents_expires on public.documents(family_id, expires_on);
