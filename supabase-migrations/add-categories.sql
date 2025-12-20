-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20) DEFAULT 'bg-blue-500',
    icon VARCHAR(50) DEFAULT 'pill',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add category_id to medicines table
ALTER TABLE medicines 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Insert common pharmacy categories
INSERT INTO categories (name, description, color, icon) VALUES
    ('Painkillers', 'Analgesics and pain relief medications', 'bg-red-500', 'zap'),
    ('Antibiotics', 'Antibacterial medications', 'bg-blue-500', 'shield'),
    ('Vitamins & Supplements', 'Nutritional supplements and vitamins', 'bg-green-500', 'leaf'),
    ('Cold & Flu', 'Medications for cold, cough, and flu symptoms', 'bg-cyan-500', 'wind'),
    ('Digestive Health', 'Medications for digestive system', 'bg-amber-500', 'package'),
    ('Cardiovascular', 'Heart and blood pressure medications', 'bg-rose-500', 'heart'),
    ('Diabetes Care', 'Diabetes management medications', 'bg-purple-500', 'activity'),
    ('Skin Care', 'Dermatological medications and creams', 'bg-pink-500', 'droplet'),
    ('Respiratory', 'Asthma and breathing medications', 'bg-teal-500', 'wind'),
    ('Others', 'Miscellaneous medications', 'bg-gray-500', 'more-horizontal')
ON CONFLICT (name) DO NOTHING;

-- Update existing medicines with appropriate categories
-- Painkillers
UPDATE medicines SET category_id = (SELECT id FROM categories WHERE name = 'Painkillers')
WHERE LOWER(name) LIKE '%paracetamol%' 
   OR LOWER(name) LIKE '%ibuprofen%' 
   OR LOWER(name) LIKE '%aspirin%'
   OR LOWER(name) LIKE '%diclofenac%';

-- Antibiotics
UPDATE medicines SET category_id = (SELECT id FROM categories WHERE name = 'Antibiotics')
WHERE LOWER(name) LIKE '%azithromycin%' 
   OR LOWER(name) LIKE '%amoxicillin%'
   OR LOWER(name) LIKE '%ciprofloxacin%'
   OR LOWER(name) LIKE '%cefixime%';

-- Vitamins & Supplements
UPDATE medicines SET category_id = (SELECT id FROM categories WHERE name = 'Vitamins & Supplements')
WHERE LOWER(name) LIKE '%vitamin%' 
   OR LOWER(name) LIKE '%calcium%'
   OR LOWER(name) LIKE '%iron%'
   OR LOWER(name) LIKE '%zinc%';

-- Cold & Flu
UPDATE medicines SET category_id = (SELECT id FROM categories WHERE name = 'Cold & Flu')
WHERE LOWER(name) LIKE '%cetirizine%' 
   OR LOWER(name) LIKE '%levocetirizine%'
   OR LOWER(name) LIKE '%phenylephrine%'
   OR LOWER(name) LIKE '%cough%';

-- Digestive Health
UPDATE medicines SET category_id = (SELECT id FROM categories WHERE name = 'Digestive Health')
WHERE LOWER(name) LIKE '%omeprazole%' 
   OR LOWER(name) LIKE '%pantoprazole%'
   OR LOWER(name) LIKE '%ranitidine%'
   OR LOWER(name) LIKE '%ors%'
   OR LOWER(name) LIKE '%antacid%';

-- Cardiovascular
UPDATE medicines SET category_id = (SELECT id FROM categories WHERE name = 'Cardiovascular')
WHERE LOWER(name) LIKE '%atorvastatin%' 
   OR LOWER(name) LIKE '%metoprolol%'
   OR LOWER(name) LIKE '%amlodipine%'
   OR LOWER(name) LIKE '%losartan%'
   OR LOWER(name) LIKE '%lisinopril%'
   OR LOWER(name) LIKE '%clopidogrel%';

-- Diabetes Care
UPDATE medicines SET category_id = (SELECT id FROM categories WHERE name = 'Diabetes Care')
WHERE LOWER(name) LIKE '%insulin%' 
   OR LOWER(name) LIKE '%metformin%'
   OR LOWER(name) LIKE '%glimepiride%';

-- Respiratory
UPDATE medicines SET category_id = (SELECT id FROM categories WHERE name = 'Respiratory')
WHERE LOWER(name) LIKE '%salbutamol%' 
   OR LOWER(name) LIKE '%montelukast%'
   OR LOWER(name) LIKE '%budesonide%';

-- Skin Care
UPDATE medicines SET category_id = (SELECT id FROM categories WHERE name = 'Skin Care')
WHERE LOWER(name) LIKE '%cream%' 
   OR LOWER(name) LIKE '%ointment%'
   OR LOWER(name) LIKE '%fluconazole%'
   OR LOWER(name) LIKE '%clotrimazole%';

-- Update remaining uncategorized to "Others"
UPDATE medicines SET category_id = (SELECT id FROM categories WHERE name = 'Others')
WHERE category_id IS NULL;

-- Create index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_medicines_category_id ON medicines(category_id);

-- Enable RLS on categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories
CREATE POLICY "Allow read access for authenticated users" ON categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON categories
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated users" ON categories
    FOR DELETE USING (auth.role() = 'authenticated');
