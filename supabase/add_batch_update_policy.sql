-- Add UPDATE policy for batches table to enable batch editing

CREATE POLICY "Authenticated users can update batches"
ON batches
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
