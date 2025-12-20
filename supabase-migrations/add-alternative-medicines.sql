-- Add alternative brand medicines for testing the Alternative Drug Suggestions feature
-- Run this AFTER seed.sql

DO $$
DECLARE
  cat_painkillers UUID;
  cat_cold UUID;
  cat_digestive UUID;
  cat_vitamins UUID;
  sup_generic UUID;
  sup_wellness UUID;
  med_id UUID;
BEGIN
  -- Get category and supplier IDs
  SELECT id INTO cat_painkillers FROM categories WHERE name = 'Painkillers';
  SELECT id INTO cat_cold FROM categories WHERE name = 'Cold & Flu';
  SELECT id INTO cat_digestive FROM categories WHERE name = 'Digestive Health';
  SELECT id INTO cat_vitamins FROM categories WHERE name = 'Vitamins & Supplements';
  SELECT id INTO sup_generic FROM suppliers WHERE name = 'Generic Meds Corp';
  SELECT id INTO sup_wellness FROM suppliers WHERE name = 'Wellness Pharma';

  -- Alternative Paracetamol brands (same generic_name = 'Paracetamol')
  INSERT INTO medicines (name, generic_name, category_id, supplier_id, sku, dosage_form, strength, unit, reorder_level, max_stock_level, requires_prescription) 
  VALUES
    ('Crocin 500mg', 'Paracetamol', cat_painkillers, sup_generic, 'CROC-500-TAB', 'tablet', '500mg', 'tablets', 150, 1500, false),
    ('Dolo 650mg', 'Paracetamol', cat_painkillers, sup_wellness, 'DOLO-650-TAB', 'tablet', '650mg', 'tablets', 120, 1200, false);

  -- Alternative Cetirizine brands (same generic_name = 'Cetirizine')
  INSERT INTO medicines (name, generic_name, category_id, supplier_id, sku, dosage_form, strength, unit, reorder_level, max_stock_level, requires_prescription) 
  VALUES
    ('Zyrtec 10mg', 'Cetirizine', cat_cold, sup_generic, 'ZYRT-010-TAB', 'tablet', '10mg', 'tablets', 100, 1000, false),
    ('Alerid 10mg', 'Cetirizine', cat_cold, sup_wellness, 'ALER-010-TAB', 'tablet', '10mg', 'tablets', 80, 800, false);

  -- Alternative Omeprazole brands (same generic_name = 'Omeprazole')
  INSERT INTO medicines (name, generic_name, category_id, supplier_id, sku, dosage_form, strength, unit, reorder_level, max_stock_level, requires_prescription) 
  VALUES
    ('Omez 20mg', 'Omeprazole', cat_digestive, sup_generic, 'OMEZ-020-CAP', 'capsule', '20mg', 'capsules', 80, 800, false);

  -- Alternative Vitamin C brands (same generic_name = 'Ascorbic Acid')
  INSERT INTO medicines (name, generic_name, category_id, supplier_id, sku, dosage_form, strength, unit, reorder_level, max_stock_level, requires_prescription) 
  VALUES
    ('Limcee 500mg', 'Ascorbic Acid', cat_vitamins, sup_wellness, 'LIMC-500-TAB', 'tablet', '500mg', 'tablets', 100, 1000, false);

  -- Now add batches for each new medicine
  FOR med_id IN 
    SELECT id FROM medicines WHERE name IN ('Crocin 500mg', 'Dolo 650mg', 'Zyrtec 10mg', 'Alerid 10mg', 'Omez 20mg', 'Limcee 500mg')
  LOOP
    -- Add a batch with stock
    INSERT INTO batches (medicine_id, batch_number, manufacturing_date, expiry_date, quantity, initial_quantity, cost_price, selling_price, supplier_id, received_date, location)
    VALUES (
      med_id,
      'ALT' || LPAD(floor(random() * 999999)::TEXT, 6, '0'),
      CURRENT_DATE - INTERVAL '6 months',
      CURRENT_DATE + INTERVAL '12 months',
      150,
      200,
      (random() * 30 + 5)::DECIMAL(10,2),
      (random() * 60 + 20)::DECIMAL(10,2),
      sup_generic,
      CURRENT_DATE - INTERVAL '14 days',
      'Shelf D-1'
    );
  END LOOP;

END $$;

SELECT 'Alternative brand medicines added successfully! Test by searching for an out-of-stock Paracetamol, Cetirizine, Omeprazole, or Vitamin C.' as status;
