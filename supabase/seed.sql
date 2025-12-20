-- ============================================
-- Smart Pharmacy Inventory - Sample Seed Data
-- Run this AFTER schema.sql
-- ============================================

-- ============================================
-- SUPPLIERS
-- ============================================

INSERT INTO suppliers (name, contact_person, email, phone, address, payment_terms, lead_time_days, rating, is_active) VALUES
  ('MedSupply India', 'Rajesh Patel', 'rajesh@medsupply.in', '+91 9876543210', 'Mumbai, Maharashtra', 'Net 30', 5, 4.5, true),
  ('PharmaCare Distributors', 'Priya Sharma', 'priya@pharmacare.com', '+91 9876543211', 'Delhi, NCR', 'Net 45', 7, 4.2, true),
  ('HealthFirst Wholesale', 'Amit Kumar', 'amit@healthfirst.in', '+91 9876543212', 'Bangalore, Karnataka', 'Net 30', 4, 4.8, true),
  ('Generic Meds Corp', 'Sunita Rao', 'sunita@genericmeds.co', '+91 9876543213', 'Hyderabad, Telangana', 'Net 60', 10, 3.9, true),
  ('Wellness Pharma', 'Vikram Singh', 'vikram@wellnesspharma.in', '+91 9876543214', 'Chennai, Tamil Nadu', 'Net 30', 6, 4.3, true);

-- ============================================
-- MEDICINES (with variety of categories)
-- ============================================

-- Get category IDs (hardcoded for seeding)
DO $$
DECLARE
  cat_antibiotics UUID;
  cat_painkillers UUID;
  cat_vitamins UUID;
  cat_cold UUID;
  cat_digestive UUID;
  cat_diabetes UUID;
  cat_cardio UUID;
  cat_skin UUID;
  cat_firstaid UUID;
  cat_baby UUID;
  sup_medsupply UUID;
  sup_pharmacare UUID;
  sup_healthfirst UUID;
  sup_generic UUID;
  sup_wellness UUID;
BEGIN
  SELECT id INTO cat_antibiotics FROM categories WHERE name = 'Antibiotics';
  SELECT id INTO cat_painkillers FROM categories WHERE name = 'Painkillers';
  SELECT id INTO cat_vitamins FROM categories WHERE name = 'Vitamins & Supplements';
  SELECT id INTO cat_cold FROM categories WHERE name = 'Cold & Flu';
  SELECT id INTO cat_digestive FROM categories WHERE name = 'Digestive Health';
  SELECT id INTO cat_diabetes FROM categories WHERE name = 'Diabetes Care';
  SELECT id INTO cat_cardio FROM categories WHERE name = 'Cardiovascular';
  SELECT id INTO cat_skin FROM categories WHERE name = 'Skin Care';
  SELECT id INTO cat_firstaid FROM categories WHERE name = 'First Aid';
  SELECT id INTO cat_baby FROM categories WHERE name = 'Baby Care';
  
  SELECT id INTO sup_medsupply FROM suppliers WHERE name = 'MedSupply India';
  SELECT id INTO sup_pharmacare FROM suppliers WHERE name = 'PharmaCare Distributors';
  SELECT id INTO sup_healthfirst FROM suppliers WHERE name = 'HealthFirst Wholesale';
  SELECT id INTO sup_generic FROM suppliers WHERE name = 'Generic Meds Corp';
  SELECT id INTO sup_wellness FROM suppliers WHERE name = 'Wellness Pharma';

  -- ANTIBIOTICS
  INSERT INTO medicines (name, generic_name, category_id, supplier_id, sku, dosage_form, strength, unit, reorder_level, max_stock_level, requires_prescription) VALUES
    ('Amoxicillin 500mg', 'Amoxicillin', cat_antibiotics, sup_medsupply, 'AMOX-500-CAP', 'capsule', '500mg', 'capsules', 100, 1000, true),
    ('Azithromycin 250mg', 'Azithromycin', cat_antibiotics, sup_pharmacare, 'AZIT-250-TAB', 'tablet', '250mg', 'tablets', 50, 500, true),
    ('Ciprofloxacin 500mg', 'Ciprofloxacin', cat_antibiotics, sup_healthfirst, 'CIPR-500-TAB', 'tablet', '500mg', 'tablets', 75, 750, true),
    ('Cephalexin 500mg', 'Cephalexin', cat_antibiotics, sup_generic, 'CEPH-500-CAP', 'capsule', '500mg', 'capsules', 60, 600, true);

  -- PAINKILLERS
  INSERT INTO medicines (name, generic_name, category_id, supplier_id, sku, dosage_form, strength, unit, reorder_level, max_stock_level, requires_prescription) VALUES
    ('Paracetamol 500mg', 'Paracetamol', cat_painkillers, sup_medsupply, 'PARA-500-TAB', 'tablet', '500mg', 'tablets', 200, 2000, false),
    ('Ibuprofen 400mg', 'Ibuprofen', cat_painkillers, sup_pharmacare, 'IBUP-400-TAB', 'tablet', '400mg', 'tablets', 150, 1500, false),
    ('Diclofenac 50mg', 'Diclofenac', cat_painkillers, sup_healthfirst, 'DICL-050-TAB', 'tablet', '50mg', 'tablets', 100, 1000, true),
    ('Aspirin 75mg', 'Aspirin', cat_painkillers, sup_wellness, 'ASPR-075-TAB', 'tablet', '75mg', 'tablets', 150, 1500, false);

  -- VITAMINS
  INSERT INTO medicines (name, generic_name, category_id, supplier_id, sku, dosage_form, strength, unit, reorder_level, max_stock_level, requires_prescription) VALUES
    ('Vitamin D3 60000 IU', 'Cholecalciferol', cat_vitamins, sup_medsupply, 'VITD-60K-CAP', 'capsule', '60000 IU', 'capsules', 80, 800, false),
    ('Vitamin C 500mg', 'Ascorbic Acid', cat_vitamins, sup_healthfirst, 'VITC-500-TAB', 'tablet', '500mg', 'tablets', 100, 1000, false),
    ('Calcium + D3', 'Calcium Carbonate', cat_vitamins, sup_generic, 'CALD-TAB', 'tablet', '500mg + 250IU', 'tablets', 120, 1200, false),
    ('Multivitamin Complex', 'Multivitamin', cat_vitamins, sup_wellness, 'MULT-TAB', 'tablet', '-', 'tablets', 100, 1000, false),
    ('Iron + Folic Acid', 'Ferrous Sulphate', cat_vitamins, sup_pharmacare, 'IRON-FOL-TAB', 'tablet', '100mg + 0.5mg', 'tablets', 80, 800, false);

  -- COLD & FLU
  INSERT INTO medicines (name, generic_name, category_id, supplier_id, sku, dosage_form, strength, unit, reorder_level, max_stock_level, requires_prescription) VALUES
    ('Cetirizine 10mg', 'Cetirizine', cat_cold, sup_medsupply, 'CETI-010-TAB', 'tablet', '10mg', 'tablets', 150, 1500, false),
    ('Cough Syrup', 'Dextromethorphan', cat_cold, sup_pharmacare, 'COUG-SYR-100', 'syrup', '100ml', 'bottles', 50, 500, false),
    ('Nasal Decongestant', 'Oxymetazoline', cat_cold, sup_healthfirst, 'NASL-DRP-15', 'drops', '15ml', 'bottles', 40, 400, false),
    ('ORS Powder', 'Oral Rehydration Salts', cat_cold, sup_generic, 'ORS-PWD-21', 'powder', '21g', 'sachets', 200, 2000, false),
    ('Throat Lozenges', 'Benzocaine', cat_cold, sup_wellness, 'THRT-LOZ-20', 'tablet', '-', 'strips', 60, 600, false);

  -- DIGESTIVE
  INSERT INTO medicines (name, generic_name, category_id, supplier_id, sku, dosage_form, strength, unit, reorder_level, max_stock_level, requires_prescription) VALUES
    ('Omeprazole 20mg', 'Omeprazole', cat_digestive, sup_medsupply, 'OMEP-020-CAP', 'capsule', '20mg', 'capsules', 100, 1000, false),
    ('Pantoprazole 40mg', 'Pantoprazole', cat_digestive, sup_pharmacare, 'PANT-040-TAB', 'tablet', '40mg', 'tablets', 80, 800, false),
    ('Antacid Gel', 'Magaldrate', cat_digestive, sup_healthfirst, 'ANTC-GEL-170', 'suspension', '170ml', 'bottles', 40, 400, false),
    ('Laxative Syrup', 'Lactulose', cat_digestive, sup_generic, 'LAXA-SYR-200', 'syrup', '200ml', 'bottles', 30, 300, false);

  -- DIABETES
  INSERT INTO medicines (name, generic_name, category_id, supplier_id, sku, dosage_form, strength, unit, reorder_level, max_stock_level, requires_prescription) VALUES
    ('Metformin 500mg', 'Metformin', cat_diabetes, sup_medsupply, 'METF-500-TAB', 'tablet', '500mg', 'tablets', 150, 1500, true),
    ('Glimepiride 2mg', 'Glimepiride', cat_diabetes, sup_pharmacare, 'GLIM-002-TAB', 'tablet', '2mg', 'tablets', 80, 800, true),
    ('Insulin Glargine', 'Insulin', cat_diabetes, sup_healthfirst, 'INSU-GLR-PEN', 'injection', '3ml', 'pens', 20, 200, true);

  -- CARDIOVASCULAR
  INSERT INTO medicines (name, generic_name, category_id, supplier_id, sku, dosage_form, strength, unit, reorder_level, max_stock_level, requires_prescription) VALUES
    ('Amlodipine 5mg', 'Amlodipine', cat_cardio, sup_medsupply, 'AMLO-005-TAB', 'tablet', '5mg', 'tablets', 100, 1000, true),
    ('Atorvastatin 10mg', 'Atorvastatin', cat_cardio, sup_pharmacare, 'ATOR-010-TAB', 'tablet', '10mg', 'tablets', 120, 1200, true),
    ('Losartan 50mg', 'Losartan', cat_cardio, sup_generic, 'LOSR-050-TAB', 'tablet', '50mg', 'tablets', 80, 800, true),
    ('Clopidogrel 75mg', 'Clopidogrel', cat_cardio, sup_wellness, 'CLOP-075-TAB', 'tablet', '75mg', 'tablets', 60, 600, true);

END $$;

-- ============================================
-- BATCHES (with varying expiry dates for FEFO testing)
-- ============================================

-- Get medicine IDs and create batches
DO $$
DECLARE
  med_record RECORD;
  sup_id UUID;
  batch_num INTEGER := 1;
BEGIN
  SELECT id INTO sup_id FROM suppliers LIMIT 1;
  
  FOR med_record IN SELECT id, name FROM medicines LOOP
    -- Batch 1: Expires in 7 days (critical)
    INSERT INTO batches (medicine_id, batch_number, manufacturing_date, expiry_date, quantity, initial_quantity, cost_price, selling_price, supplier_id, received_date, location)
    VALUES (
      med_record.id,
      'BT' || LPAD(batch_num::TEXT, 6, '0'),
      CURRENT_DATE - INTERVAL '11 months',
      CURRENT_DATE + INTERVAL '7 days',
      25,
      100,
      (random() * 50 + 10)::DECIMAL(10,2),
      (random() * 100 + 30)::DECIMAL(10,2),
      sup_id,
      CURRENT_DATE - INTERVAL '30 days',
      'Shelf A-' || (batch_num % 5 + 1)
    );
    batch_num := batch_num + 1;
    
    -- Batch 2: Expires in 45 days (warning)
    INSERT INTO batches (medicine_id, batch_number, manufacturing_date, expiry_date, quantity, initial_quantity, cost_price, selling_price, supplier_id, received_date, location)
    VALUES (
      med_record.id,
      'BT' || LPAD(batch_num::TEXT, 6, '0'),
      CURRENT_DATE - INTERVAL '10 months',
      CURRENT_DATE + INTERVAL '45 days',
      75,
      150,
      (random() * 50 + 10)::DECIMAL(10,2),
      (random() * 100 + 30)::DECIMAL(10,2),
      sup_id,
      CURRENT_DATE - INTERVAL '20 days',
      'Shelf B-' || (batch_num % 5 + 1)
    );
    batch_num := batch_num + 1;
    
    -- Batch 3: Expires in 8 months (safe)
    INSERT INTO batches (medicine_id, batch_number, manufacturing_date, expiry_date, quantity, initial_quantity, cost_price, selling_price, supplier_id, received_date, location)
    VALUES (
      med_record.id,
      'BT' || LPAD(batch_num::TEXT, 6, '0'),
      CURRENT_DATE - INTERVAL '4 months',
      CURRENT_DATE + INTERVAL '8 months',
      200,
      200,
      (random() * 50 + 10)::DECIMAL(10,2),
      (random() * 100 + 30)::DECIMAL(10,2),
      sup_id,
      CURRENT_DATE - INTERVAL '7 days',
      'Shelf C-' || (batch_num % 5 + 1)
    );
    batch_num := batch_num + 1;
  END LOOP;
END $$;

-- ============================================
-- SEASONAL PATTERNS (for monsoon medicines)
-- ============================================

DO $$
DECLARE
  med_id UUID;
BEGIN
  -- Paracetamol - high demand in monsoon
  SELECT id INTO med_id FROM medicines WHERE name LIKE 'Paracetamol%';
  IF med_id IS NOT NULL THEN
    INSERT INTO seasonal_patterns (medicine_id, season, multiplier, notes) VALUES
      (med_id, 'monsoon', 1.8, 'High fever cases during monsoon'),
      (med_id, 'winter', 1.5, 'Cold and flu season');
  END IF;
  
  -- ORS - monsoon essential
  SELECT id INTO med_id FROM medicines WHERE name LIKE 'ORS%';
  IF med_id IS NOT NULL THEN
    INSERT INTO seasonal_patterns (medicine_id, season, multiplier, notes) VALUES
      (med_id, 'monsoon', 2.5, 'Diarrhea outbreaks during monsoon'),
      (med_id, 'summer', 1.5, 'Dehydration in summer');
  END IF;
  
  -- Cetirizine - high in all allergic seasons
  SELECT id INTO med_id FROM medicines WHERE name LIKE 'Cetirizine%';
  IF med_id IS NOT NULL THEN
    INSERT INTO seasonal_patterns (medicine_id, season, multiplier, notes) VALUES
      (med_id, 'monsoon', 1.6, 'Allergies during monsoon'),
      (med_id, 'winter', 1.4, 'Cold allergies');
  END IF;
  
  -- Vitamin D - winter boost  
  SELECT id INTO med_id FROM medicines WHERE name LIKE 'Vitamin D3%';
  IF med_id IS NOT NULL THEN
    INSERT INTO seasonal_patterns (medicine_id, season, multiplier, notes) VALUES
      (med_id, 'winter', 1.7, 'Less sunlight exposure');
  END IF;
  
  -- Vitamin C - flu season essential
  SELECT id INTO med_id FROM medicines WHERE name LIKE 'Vitamin C%';
  IF med_id IS NOT NULL THEN
    INSERT INTO seasonal_patterns (medicine_id, season, multiplier, notes) VALUES
      (med_id, 'flu_season', 2.0, 'Immunity boost during flu'),
      (med_id, 'winter', 1.5, 'Cold prevention');
  END IF;
END $$;

-- ============================================
-- SAMPLE ALERTS (for testing dashboard)
-- ============================================

DO $$
DECLARE
  med_para UUID;
  med_ors UUID;
  batch_exp UUID;
BEGIN
  SELECT id INTO med_para FROM medicines WHERE name LIKE 'Paracetamol%' LIMIT 1;
  SELECT id INTO med_ors FROM medicines WHERE name LIKE 'ORS%' LIMIT 1;
  SELECT b.id INTO batch_exp FROM batches b 
    JOIN medicines m ON b.medicine_id = m.id 
    WHERE b.expiry_date < CURRENT_DATE + INTERVAL '30 days' 
    LIMIT 1;
  
  -- Low stock alert
  INSERT INTO alerts (type, severity, title, message, medicine_id, data) VALUES
    ('low_stock', 'warning', 'Low Stock Alert', 'Insulin Glargine stock is below reorder level. Current: 15 units, Reorder at: 20 units.', 
     (SELECT id FROM medicines WHERE name LIKE 'Insulin%' LIMIT 1),
     '{"current_stock": 15, "reorder_level": 20}'::JSONB);
  
  -- Expiry warning
  INSERT INTO alerts (type, severity, title, message, medicine_id, batch_id, data) VALUES
    ('expiry_warning', 'critical', 'Expiring Soon: Amoxicillin', 'Batch BT000001 expires in 7 days. 25 units remaining.',
     (SELECT id FROM medicines WHERE name LIKE 'Amoxicillin%' LIMIT 1),
     batch_exp,
     '{"days_until_expiry": 7, "quantity": 25}'::JSONB);
  
  -- Demand spike
  INSERT INTO alerts (type, severity, title, message, medicine_id, data) VALUES
    ('demand_spike', 'info', 'Demand Spike Detected', 'Paracetamol demand increased 45% compared to last week. Consider increasing stock.',
     med_para,
     '{"increase_percent": 45, "current_demand": 580, "previous_demand": 400}'::JSONB);
  
  -- Reorder suggestion
  INSERT INTO alerts (type, severity, title, message, medicine_id, data) VALUES
    ('reorder_suggestion', 'info', 'Reorder Recommendation', 'Based on current sales velocity and seasonal trends, recommend ordering 500 units of ORS before monsoon.',
     med_ors,
     '{"recommended_qty": 500, "reason": "Monsoon season approaching"}'::JSONB);
END $$;

SELECT 'Seed data inserted successfully!' as status;
