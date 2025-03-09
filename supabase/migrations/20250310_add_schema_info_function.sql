-- Create a function to get schema information for a table
CREATE OR REPLACE FUNCTION get_schema_info(table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    columns.column_name::TEXT,
    columns.data_type::TEXT,
    (columns.is_nullable = 'YES')::BOOLEAN
  FROM 
    information_schema.columns
  WHERE 
    columns.table_name = table_name
    AND columns.table_schema = 'public';
END;
$$;
