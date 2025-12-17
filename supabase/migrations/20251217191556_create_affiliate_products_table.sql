/*
  # Create Affiliate Products Table

  1. New Tables
    - `affiliate_products`
      - `id` (uuid, primary key) - Unique identifier
      - `title` (text) - Product name
      - `description` (text) - Product description
      - `image_url` (text) - Product image URL
      - `affiliate_link` (text) - External affiliate URL
      - `platform` (text) - Platform name (e.g., "Amazon", "REI")
      - `category` (text) - Product category (e.g., "hiking", "camping", "wellness")
      - `featured` (boolean) - Whether product is featured
      - `sort_order` (integer) - Display order
      - `active` (boolean) - Whether product is visible
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `affiliate_products` table
    - Add policy for all users to read active products
    - Only authenticated users can view products

  3. Indexes
    - Index on `category` for filtering
    - Index on `featured` for homepage display
    - Index on `active` for visibility control
*/

CREATE TABLE IF NOT EXISTS affiliate_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL,
  affiliate_link text NOT NULL,
  platform text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON affiliate_products
  FOR SELECT
  TO authenticated
  USING (active = true);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_category ON affiliate_products(category);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_featured ON affiliate_products(featured);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_active ON affiliate_products(active);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_sort_order ON affiliate_products(sort_order);