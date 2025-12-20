-- Add DELETE policy for sales table
CREATE POLICY "Authenticated users can delete sales"
ON sales
FOR DELETE
TO authenticated
USING (true);

-- Also add UPDATE policy while we're at it
CREATE POLICY "Authenticated users can update sales"
ON sales
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
