import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2/promise";
import { env } from "../config/env";
import { execute, query, queryOne } from "./pool";

const DEMO_PASSWORD = "Password123!";

if (env.isProduction && !process.argv.includes("--force")) {
  console.error("Refusing to run development seeds in production. Re-run with --force if you are certain.");
  process.exit(1);
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function seedRoles(): Promise<Record<string, number>> {
  await execute(`
    INSERT INTO roles (name, description) VALUES
      ('buyer', 'Can browse products, save favourites and message sellers'),
      ('seller', 'Can publish food listings, subject to administrator approval'),
      ('admin', 'Platform administrator with moderation and management privileges')
    ON DUPLICATE KEY UPDATE description = VALUES(description)
  `);
  const rows = await query<RowDataPacket[]>("SELECT id, name FROM roles");
  return Object.fromEntries(rows.map((row) => [String(row.name), Number(row.id)]));
}

async function seedUser(
  email: string,
  fullName: string,
  phone: string | null,
  roleNames: string[],
  roles: Record<string, number>,
): Promise<number> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await execute(
    `INSERT INTO users (email, password_hash, full_name, phone, is_email_verified, preferred_language)
     VALUES (?, ?, ?, ?, 1, 'en')
     ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), phone = VALUES(phone),
       password_hash = VALUES(password_hash), is_email_verified = 1`,
    [email, passwordHash, fullName, phone],
  );
  const user = await queryOne<RowDataPacket>("SELECT id FROM users WHERE email = ?", [email]);
  if (!user) throw new Error(`Failed to seed user ${email}`);
  const userId = Number(user.id);
  for (const roleName of roleNames) {
    const roleId = roles[roleName];
    if (!roleId) throw new Error(`Unknown role ${roleName}`);
    await execute("INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, roleId]);
  }
  return userId;
}

async function seedLocations(): Promise<Record<string, number>> {
  const provinces = [
    ["Kigali City", "province"],
    ["Northern Province", "province"],
    ["Southern Province", "province"],
    ["Eastern Province", "province"],
    ["Western Province", "province"],
  ] as const;
  for (const [name, type] of provinces) {
    await execute("INSERT IGNORE INTO locations (name, type) VALUES (?, ?)", [name, type]);
  }
  const provinceRows = await query<RowDataPacket[]>(
    "SELECT id, name FROM locations WHERE type = 'province'",
  );
  const provinceIds = Object.fromEntries(provinceRows.map((row) => [String(row.name), Number(row.id)]));

  const districts: Record<string, string[]> = {
    "Kigali City": ["Gasabo", "Kicukiro", "Nyarugenge"],
    "Northern Province": ["Burera", "Gakenke", "Gicumbi", "Musanze", "Rulindo"],
    "Southern Province": [
      "Gisagara",
      "Huye",
      "Kamonyi",
      "Muhanga",
      "Nyamagabe",
      "Nyanza",
      "Nyaruguru",
      "Ruhango",
    ],
    "Eastern Province": [
      "Bugesera",
      "Gatsibo",
      "Kayonza",
      "Kirehe",
      "Ngoma",
      "Nyagatare",
      "Rwamagana",
    ],
    "Western Province": [
      "Karongi",
      "Ngororero",
      "Nyabihu",
      "Nyamasheke",
      "Rubavu",
      "Rusizi",
      "Rutsiro",
    ],
  };

  for (const [province, list] of Object.entries(districts)) {
    for (const district of list) {
      await execute("INSERT IGNORE INTO locations (name, type, parent_id) VALUES (?, 'district', ?)", [
        district,
        provinceIds[province],
      ]);
    }
  }

  const rows = await query<RowDataPacket[]>("SELECT id, name FROM locations WHERE type = 'district'");
  return Object.fromEntries(rows.map((row) => [String(row.name), Number(row.id)]));
}

async function seedMarkets(locations: Record<string, number>): Promise<Record<string, number>> {
  const markets: Array<[string, string, string]> = [
    ["Nyabugogo Market", "Nyarugenge", "Nyabugogo, Kigali"],
    ["Kimironko Market", "Gasabo", "Kimironko, Kigali"],
    ["Gikondo Market", "Kicukiro", "Gikondo, Kigali"],
    ["Musanze Central Market", "Musanze", "Musanze town"],
    ["Huye Central Market", "Huye", "Huye town"],
    ["Rubavu Market", "Rubavu", "Gisenyi, Rubavu"],
    ["Muhanga Market", "Muhanga", "Muhanga town"],
    ["Nyagatare Market", "Nyagatare", "Nyagatare town"],
  ];
  for (const [name, district, address] of markets) {
    await execute(
      `INSERT INTO markets (name, location_id, address) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE address = VALUES(address)`,
      [name, locations[district], address],
    );
  }
  const rows = await query<RowDataPacket[]>("SELECT id, name FROM markets");
  return Object.fromEntries(rows.map((row) => [String(row.name), Number(row.id)]));
}

async function seedCategories(): Promise<Record<string, number>> {
  const categories: Array<[string, string, string, string]> = [
    ["Vegetables", "vegetables", "Fresh vegetables from Rwandan farms and markets", "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=70"],
    ["Fruits", "fruits", "Seasonal fruits including bananas, avocados and pineapples", "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=600&q=70"],
    ["Grains & Cereals", "grains-cereals", "Maize, rice, sorghum and other staples", "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=70"],
    ["Legumes", "legumes", "Beans, peas, groundnuts and other pulses", "https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=600&q=70"],
    ["Tubers & Roots", "tubers-roots", "Irish potatoes, sweet potatoes, cassava and more", "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=70"],
    ["Livestock & Meat", "livestock-meat", "Beef, goat, chicken and other proteins", "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=600&q=70"],
    ["Dairy & Eggs", "dairy-eggs", "Milk, cheese, yoghurt and eggs", "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=70"],
    ["Fish", "fish", "Fresh and dried fish from Rwanda's lakes", "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?auto=format&fit=crop&w=600&q=70"],
    ["Processed Foods", "processed-foods", "Flour, oil, honey and other processed products", "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=70"],
    ["Seeds & Inputs", "seeds-inputs", "Quality seeds and agricultural inputs", "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=600&q=70"],
  ];
  for (const [name, slug, description, imageUrl] of categories) {
    await execute(
      `INSERT INTO categories (name, slug, description, image_url) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description), image_url = VALUES(image_url)`,
      [name, slug, description, imageUrl],
    );
  }
  const rows = await query<RowDataPacket[]>("SELECT id, slug FROM categories");
  return Object.fromEntries(rows.map((row) => [String(row.slug), Number(row.id)]));
}

async function seedUnits(): Promise<Record<string, number>> {
  const units: Array<[string, string, string, number]> = [
    ["kg", "Kilogram", "weight", 1],
    ["g", "Gram", "weight", 0.001],
    ["tonne", "Tonne", "weight", 1000],
    ["litre", "Litre", "volume", 1],
    ["ml", "Millilitre", "volume", 0.001],
    ["piece", "Piece", "count", 1],
    ["dozen", "Dozen", "count", 12],
    ["bunch", "Bunch", "bunch", 1],
    ["bag", "Bag", "bag", 1],
    ["sack", "Sack", "sack", 1],
  ];
  for (const [code, label, dimension, factor] of units) {
    await execute(
      `INSERT INTO units (code, label, dimension, factor_to_base) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), dimension = VALUES(dimension),
         factor_to_base = VALUES(factor_to_base)`,
      [code, label, dimension, factor],
    );
  }
  const rows = await query<RowDataPacket[]>("SELECT id, code FROM units");
  return Object.fromEntries(rows.map((row) => [String(row.code), Number(row.id)]));
}

async function seedSellerProfile(input: {
  userId: number;
  businessName: string;
  description: string;
  districtId: number;
  marketId: number;
  phone: string;
  publicContact: boolean;
}): Promise<void> {
  await execute(
    `INSERT INTO seller_profiles
      (user_id, business_name, description, location_id, market_id, contact_phone, contact_email,
       preferred_contact, public_contact_visibility)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 'message', ?)
     ON DUPLICATE KEY UPDATE business_name = VALUES(business_name), description = VALUES(description),
       location_id = VALUES(location_id), market_id = VALUES(market_id), contact_phone = VALUES(contact_phone),
       public_contact_visibility = VALUES(public_contact_visibility)`,
    [
      input.userId,
      input.businessName,
      input.description,
      input.districtId,
      input.marketId,
      input.phone,
      input.publicContact ? 1 : 0,
    ],
  );
}

interface SeedProductInput {
  sellerId: number;
  categoryId: number;
  unitId: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  locationId: number;
  marketId: number | null;
  availability: "available" | "unavailable" | "sold";
  approvalStatus: "pending" | "approved" | "rejected" | "requires_correction" | "suspended";
  featured?: boolean;
  rejectionReason?: string | null;
  images: string[];
  adminId: number;
}

async function seedProduct(input: SeedProductInput): Promise<number> {
  const existing = await queryOne<RowDataPacket>(
    "SELECT id FROM products WHERE seller_id = ? AND name = ? LIMIT 1",
    [input.sellerId, input.name],
  );

  const approved = input.approvalStatus === "approved";
  let productId: number;

  if (existing) {
    productId = Number(existing.id);
    await execute(
      `UPDATE products SET category_id = ?, unit_id = ?, description = ?, price = ?, quantity = ?,
         location_id = ?, market_id = ?, availability = ?, approval_status = ?, is_featured = ?,
         rejection_reason = ?, approved_at = ?, approved_by = ?, updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [
        input.categoryId,
        input.unitId,
        input.description,
        input.price,
        input.quantity,
        input.locationId,
        input.marketId,
        input.availability,
        input.approvalStatus,
        input.featured ? 1 : 0,
        input.rejectionReason ?? null,
        approved ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
        approved ? input.adminId : null,
        productId,
      ],
    );
  } else {
    const result = await execute(
      `INSERT INTO products
        (seller_id, category_id, unit_id, name, description, price, quantity, location_id, market_id,
         availability, approval_status, is_featured, rejection_reason, approved_at, approved_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.sellerId,
        input.categoryId,
        input.unitId,
        input.name,
        input.description,
        input.price,
        input.quantity,
        input.locationId,
        input.marketId,
        input.availability,
        input.approvalStatus,
        input.featured ? 1 : 0,
        input.rejectionReason ?? null,
        approved ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
        approved ? input.adminId : null,
      ],
    );
    productId = result.insertId;
  }

  await execute("DELETE FROM product_images WHERE product_id = ?", [productId]);
  for (let index = 0; index < input.images.length; index += 1) {
    await execute(
      "INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order) VALUES (?, ?, ?, ?, ?)",
      [productId, input.images[index], input.name, index === 0 ? 1 : 0, index],
    );
  }

  const historyCount = await queryOne<RowDataPacket>(
    "SELECT COUNT(*) AS count FROM product_approval_history WHERE product_id = ?",
    [productId],
  );
  if (Number(historyCount?.count ?? 0) === 0) {
    await execute(
      "INSERT INTO product_approval_history (product_id, admin_id, action, reason) VALUES (?, ?, 'submitted', NULL)",
      [productId, input.sellerId],
    );
    if (approved) {
      await execute(
        "INSERT INTO product_approval_history (product_id, admin_id, action, reason) VALUES (?, ?, 'approved', 'Seed approval')",
        [productId, input.adminId],
      );
    }
    if (input.approvalStatus === "rejected") {
      await execute(
        "INSERT INTO product_approval_history (product_id, admin_id, action, reason) VALUES (?, ?, 'rejected', ?)",
        [productId, input.adminId, input.rejectionReason ?? "Listing did not meet guidelines"],
      );
    }
  }

  return productId;
}

async function seedPriceObservation(input: {
  productName: string;
  categoryId: number;
  marketId: number;
  locationId: number;
  unitId: number;
  price: number;
  observedOn: string;
  source: string;
  verificationStatus: "verified" | "unverified";
  observedBy: string;
  notes?: string;
  createdBy: number;
}): Promise<void> {
  const existing = await queryOne<RowDataPacket>(
    `SELECT id FROM market_price_observations
     WHERE product_name = ? AND market_id = ? AND observed_on = ? AND source = ? LIMIT 1`,
    [input.productName, input.marketId, input.observedOn, input.source],
  );
  if (existing) return;
  await execute(
    `INSERT INTO market_price_observations
      (product_name, category_id, market_id, location_id, unit_id, price, observed_on, source,
       verification_status, observed_by, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.productName,
      input.categoryId,
      input.marketId,
      input.locationId,
      input.unitId,
      input.price,
      input.observedOn,
      input.source,
      input.verificationStatus,
      input.observedBy,
      input.notes ?? null,
      input.createdBy,
    ],
  );
}

async function run(): Promise<void> {
  console.log("[seed] starting development seed");
  const roles = await seedRoles();

  const adminId = await seedUser("admin@isokolink.rw", "ISOKOLINK Administrator", "+250788000001", ["admin"], roles);
  const buyerId = await seedUser("buyer@example.com", "Aline Uwase", "+250788000002", ["buyer"], roles);
  const secondBuyerId = await seedUser("buyer2@example.com", "Eric Habimana", "+250788000003", ["buyer"], roles);
  const seller1Id = await seedUser("seller@example.com", "Jean Bosco Farm", "+250788000004", ["buyer", "seller"], roles);
  const seller2Id = await seedUser("seller2@example.com", "Kigali Fresh Produce", "+250788000005", ["buyer", "seller"], roles);

  const locations = await seedLocations();
  const markets = await seedMarkets(locations);
  const categories = await seedCategories();
  const units = await seedUnits();

  await seedSellerProfile({
    userId: seller1Id,
    businessName: "Jean Bosco Farm",
    description:
      "Family farm in Musanze supplying fresh vegetables, potatoes and dairy to buyers across Rwanda.",
    districtId: locations["Musanze"] ?? 1,
    marketId: markets["Musanze Central Market"] ?? 1,
    phone: "+250788000004",
    publicContact: true,
  });
  await seedSellerProfile({
    userId: seller2Id,
    businessName: "Kigali Fresh Produce",
    description:
      "Wholesale and retail supplier of grains, fruits and vegetables based at Nyabugogo Market, Kigali.",
    districtId: locations["Nyarugenge"] ?? 1,
    marketId: markets["Nyabugogo Market"] ?? 1,
    phone: "+250788000005",
    publicContact: false,
  });

  const kigali = locations["Nyarugenge"] ?? 1;
  const gasabo = locations["Gasabo"] ?? 1;
  const musanze = locations["Musanze"] ?? 1;
  const huye = locations["Huye"] ?? 1;

  const productIds: Record<string, number> = {};
  productIds.tomatoes = await seedProduct({
    sellerId: seller1Id,
    categoryId: categories["vegetables"] ?? 1,
    unitId: units["kg"] ?? 1,
    name: "Fresh Tomatoes",
    description:
      "Ripe, firm tomatoes harvested from greenhouses in Musanze. Sold per kilogram, suitable for households, restaurants and resellers.",
    price: 1200,
    quantity: 250,
    locationId: musanze,
    marketId: markets["Musanze Central Market"] ?? null,
    availability: "available",
    approvalStatus: "approved",
    featured: true,
    images: ["https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  productIds.tomatoesKigali = await seedProduct({
    sellerId: seller2Id,
    categoryId: categories["vegetables"] ?? 1,
    unitId: units["kg"] ?? 1,
    name: "Tomatoes (Wholesale)",
    description:
      "Wholesale tomatoes delivered to Nyabugogo Market. Minimum order 10 kg. Prices vary with daily market supply.",
    price: 1000,
    quantity: 600,
    locationId: kigali,
    marketId: markets["Nyabugogo Market"] ?? null,
    availability: "available",
    approvalStatus: "approved",
    images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller1Id,
    categoryId: categories["tubers-roots"] ?? 1,
    unitId: units["kg"] ?? 1,
    name: "Irish Potatoes",
    description: "Well-sorted Irish potatoes from Musanze highlands. Ideal for chips, boiling and roasting.",
    price: 650,
    quantity: 1200,
    locationId: musanze,
    marketId: markets["Musanze Central Market"] ?? null,
    availability: "available",
    approvalStatus: "approved",
    featured: true,
    images: ["https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller2Id,
    categoryId: categories["legumes"] ?? 1,
    unitId: units["kg"] ?? 1,
    name: "Red Kidney Beans",
    description: "Cleaned and sorted red kidney beans, packed in 1 kg portions or bulk bags on request.",
    price: 1200,
    quantity: 800,
    locationId: kigali,
    marketId: markets["Nyabugogo Market"] ?? null,
    availability: "available",
    approvalStatus: "approved",
    images: ["https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller1Id,
    categoryId: categories["grains-cereals"] ?? 1,
    unitId: units["kg"] ?? 1,
    name: "Maize Flour",
    description: "Locally milled maize flour for ugali and porridge. Freshly milled every week.",
    price: 900,
    quantity: 500,
    locationId: musanze,
    marketId: markets["Musanze Central Market"] ?? null,
    availability: "available",
    approvalStatus: "approved",
    images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller2Id,
    categoryId: categories["grains-cereals"] ?? 1,
    unitId: units["kg"] ?? 1,
    name: "Long Grain Rice",
    description: "Imported long grain rice repacked in Kigali. Available for retail and wholesale buyers.",
    price: 1500,
    quantity: 900,
    locationId: kigali,
    marketId: markets["Nyabugogo Market"] ?? null,
    availability: "available",
    approvalStatus: "approved",
    images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller1Id,
    categoryId: categories["fruits"] ?? 1,
    unitId: units["bunch"] ?? 1,
    name: "Sweet Bananas",
    description: "Sweet bananas sold by the bunch. Harvested to order and delivered within Kigali or Musanze.",
    price: 5000,
    quantity: 60,
    locationId: musanze,
    marketId: markets["Musanze Central Market"] ?? null,
    availability: "available",
    approvalStatus: "approved",
    featured: true,
    images: ["https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller2Id,
    categoryId: categories["fruits"] ?? 1,
    unitId: units["piece"] ?? 1,
    name: "Hass Avocado",
    description: "Ripe Hass avocados from Kayonza. Sold per piece, with discounts for orders over 50 pieces.",
    price: 500,
    quantity: 300,
    locationId: kigali,
    marketId: markets["Kimironko Market"] ?? null,
    availability: "available",
    approvalStatus: "approved",
    images: ["https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller1Id,
    categoryId: categories["dairy-eggs"] ?? 1,
    unitId: units["litre"] ?? 1,
    name: "Fresh Cow Milk",
    description: "Fresh milk from our farm, delivered chilled in 1 litre containers within Musanze.",
    price: 1200,
    quantity: 120,
    locationId: musanze,
    marketId: null,
    availability: "available",
    approvalStatus: "approved",
    images: ["https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller2Id,
    categoryId: categories["dairy-eggs"] ?? 1,
    unitId: units["piece"] ?? 1,
    name: "Farm Eggs",
    description: "Fresh farm eggs sold per piece. Trays of 30 are available on request.",
    price: 250,
    quantity: 1200,
    locationId: kigali,
    marketId: markets["Kimironko Market"] ?? null,
    availability: "available",
    approvalStatus: "approved",
    images: ["https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller1Id,
    categoryId: categories["tubers-roots"] ?? 1,
    unitId: units["kg"] ?? 1,
    name: "Cassava",
    description: "Fresh cassava roots sold per kilogram. Best collected within two days of harvest.",
    price: 500,
    quantity: 400,
    locationId: musanze,
    marketId: null,
    availability: "available",
    approvalStatus: "approved",
    images: ["https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller2Id,
    categoryId: categories["fruits"] ?? 1,
    unitId: units["piece"] ?? 1,
    name: "Pineapple",
    description: "Sweet pineapples from Bugesera. Sold per piece and available for bulk orders.",
    price: 1500,
    quantity: 180,
    locationId: kigali,
    marketId: markets["Kimironko Market"] ?? null,
    availability: "available",
    approvalStatus: "approved",
    images: ["https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller1Id,
    categoryId: categories["fish"] ?? 1,
    unitId: units["kg"] ?? 1,
    name: "Fresh Tilapia",
    description: "Fresh tilapia from Lake Kivu, delivered on ice. Awaiting approval before public display.",
    price: 4500,
    quantity: 80,
    locationId: musanze,
    marketId: null,
    availability: "available",
    approvalStatus: "pending",
    images: ["https://images.unsplash.com/photo-1544943910-4c1dc44aab44?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller2Id,
    categoryId: categories["vegetables"] ?? 1,
    unitId: units["bunch"] ?? 1,
    name: "Fresh Spinach",
    description: "Leafy spinach bundles harvested this morning. Pending administrator review.",
    price: 500,
    quantity: 100,
    locationId: kigali,
    marketId: markets["Nyabugogo Market"] ?? null,
    availability: "available",
    approvalStatus: "pending",
    images: ["https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller2Id,
    categoryId: categories["processed-foods"] ?? 1,
    unitId: units["kg"] ?? 1,
    name: "Organic Honey",
    description: "Raw organic honey. Listing rejected because the source and certification were not provided.",
    price: 8000,
    quantity: 50,
    locationId: kigali,
    marketId: null,
    availability: "unavailable",
    approvalStatus: "rejected",
    rejectionReason: "Please provide the origin of the honey and any certification before resubmitting.",
    images: ["https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller1Id,
    categoryId: categories["livestock-meat"] ?? 1,
    unitId: units["kg"] ?? 1,
    name: "Beef (Grass-fed)",
    description: "Grass-fed beef sold per kilogram. Price needs clarification: is it per kg or per cut?",
    price: 3500,
    quantity: 70,
    locationId: musanze,
    marketId: null,
    availability: "available",
    approvalStatus: "requires_correction",
    rejectionReason: "Clarify the cut and confirm whether the price is per kilogram.",
    images: ["https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  await seedProduct({
    sellerId: seller2Id,
    categoryId: categories["grains-cereals"] ?? 1,
    unitId: units["kg"] ?? 1,
    name: "Sorghum",
    description: "Locally grown sorghum, currently sold out. Relisting once the next harvest arrives.",
    price: 700,
    quantity: 0,
    locationId: huye,
    marketId: markets["Huye Central Market"] ?? null,
    availability: "sold",
    approvalStatus: "approved",
    images: ["https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=70"],
    adminId,
  });

  const observationTemplate = [
    ["Maize Flour", categories["grains-cereals"], units["kg"], "Prices collected from market traders"],
    ["Red Kidney Beans", categories["legumes"], units["kg"], "Prices collected from market traders"],
    ["Long Grain Rice", categories["grains-cereals"], units["kg"], "Prices collected from market traders"],
    ["Tomatoes", categories["vegetables"], units["kg"], "Prices collected from market traders"],
    ["Irish Potatoes", categories["tubers-roots"], units["kg"], "Prices collected from market traders"],
    ["Sweet Bananas", categories["fruits"], units["bunch"], "Prices collected from market traders"],
  ] as const;

  const marketPriceMatrix: Record<string, Array<[string, number]>> = {
    "Maize Flour": [["Nyabugogo Market", 950], ["Kimironko Market", 1000], ["Musanze Central Market", 880], ["Huye Central Market", 900]],
    "Red Kidney Beans": [["Nyabugogo Market", 1300], ["Kimironko Market", 1250], ["Musanze Central Market", 1150], ["Huye Central Market", 1200]],
    "Long Grain Rice": [["Nyabugogo Market", 1600], ["Kimironko Market", 1650], ["Musanze Central Market", 1550], ["Rubavu Market", 1700]],
    Tomatoes: [["Nyabugogo Market", 1100], ["Kimironko Market", 1250], ["Musanze Central Market", 900], ["Huye Central Market", 1050]],
    "Irish Potatoes": [["Nyabugogo Market", 700], ["Kimironko Market", 750], ["Musanze Central Market", 600], ["Huye Central Market", 650]],
    "Sweet Bananas": [["Nyabugogo Market", 5500], ["Kimironko Market", 5800], ["Musanze Central Market", 4800], ["Rubavu Market", 5200]],
  };

  const marketDistricts: Record<string, number> = {
    "Nyabugogo Market": locations["Nyarugenge"] ?? kigali,
    "Kimironko Market": gasabo,
    "Musanze Central Market": musanze,
    "Huye Central Market": huye,
    "Rubavu Market": locations["Rubavu"] ?? kigali,
  };

  for (const [productName, categoryId, unitId] of observationTemplate) {
    const rows = marketPriceMatrix[productName] ?? [];
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!row) continue;
      const [marketName, price] = row;
      if (!categoryId || !unitId || !marketName) continue;
      const marketId = markets[marketName];
      const locationId = marketDistricts[marketName];
      if (!marketId || !locationId) continue;
      const stale = index === rows.length - 1;
      await seedPriceObservation({
        productName,
        categoryId,
        marketId,
        locationId,
        unitId,
        price,
        observedOn: daysAgo(stale ? 34 : 2 + index),
        source: "ISOKOLINK field survey",
        verificationStatus: stale ? "unverified" : "verified",
        observedBy: "ISOKOLINK market team",
        notes: stale ? "Older observation — verify with the market before relying on it." : undefined,
        createdBy: adminId,
      });
    }
  }

  async function ensureConversation(
    subject: string,
    participantIds: number[],
    productId: number | null,
    creatorId: number,
    messages: Array<[number, string]>,
  ): Promise<void> {
    let conversation = await queryOne<RowDataPacket>("SELECT id FROM conversations WHERE subject = ? LIMIT 1", [subject]);
    let conversationId: number;
    if (conversation) {
      conversationId = Number(conversation.id);
    } else {
      const result = await execute(
        "INSERT INTO conversations (subject, product_id, created_by, last_message_at) VALUES (?, ?, ?, UTC_TIMESTAMP())",
        [subject, productId, creatorId],
      );
      conversationId = result.insertId;
      for (const participantId of participantIds) {
        await execute(
          "INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)",
          [conversationId, participantId],
        );
      }
      for (const [senderId, body] of messages) {
        await execute("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)", [
          conversationId,
          senderId,
          body,
        ]);
      }
      await execute("UPDATE conversations SET last_message_at = UTC_TIMESTAMP() WHERE id = ?", [conversationId]);
    }
  }

  await ensureConversation(
    "Question about Fresh Tomatoes",
    [buyerId, seller1Id],
    productIds.tomatoes ?? null,
    buyerId,
    [
      [buyerId, "Hello, are the tomatoes still available? I would like to buy 20 kg."],
      [seller1Id, "Hello Aline, yes we have plenty available. When would you like delivery?"],
      [buyerId, "Saturday morning would be ideal. Can you deliver to Kimironko?"],
    ],
  );

  await ensureConversation(
    "Welcome to ISOKOLINK RWANDA",
    [adminId, buyerId],
    null,
    adminId,
    [
      [adminId, "Welcome to ISOKOLINK RWANDA. Browse products, compare prices and message sellers directly."],
      [buyerId, "Thank you. I will explore the marketplace this week."],
    ],
  );

  await ensureConversation(
    "Seller profile verification",
    [adminId, seller2Id],
    null,
    adminId,
    [
      [adminId, "Your seller profile looks complete. Please keep your market prices updated."],
      [seller2Id, "Noted. We update our stock every Monday and Thursday."],
    ],
  );

  const notificationCount = await queryOne<RowDataPacket>(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id IN (?, ?, ?, ?)",
    [buyerId, secondBuyerId, seller1Id, seller2Id],
  );
  if (Number(notificationCount?.count ?? 0) === 0) {
    await execute(
      `INSERT INTO notifications (user_id, type, title, body, link, is_read) VALUES
        (?, 'account', 'Welcome to ISOKOLINK RWANDA', 'Complete your profile to get the most from the marketplace.', '/dashboard/profile', 0),
        (?, 'message', 'New message from Jean Bosco Farm', 'Your question about Fresh Tomatoes has a reply.', '/dashboard/conversations', 0),
        (?, 'account', 'Welcome to ISOKOLINK RWANDA', 'Start by browsing approved products near you.', '/products', 1),
        (?, 'product_pending', 'Listing submitted for approval', 'Fresh Tilapia is awaiting administrator review.', '/seller/products', 0),
        (?, 'product_approved', 'Your listing was approved', 'Sweet Bananas is now visible to buyers.', '/seller/products', 0),
        (?, 'product_pending', 'Listing submitted for approval', 'Fresh Spinach is awaiting administrator review.', '/seller/products', 0)`,
      [buyerId, buyerId, secondBuyerId, seller1Id, seller1Id, seller2Id],
    );
  }

  const reportCount = await queryOne<RowDataPacket>("SELECT COUNT(*) AS count FROM product_reports");
  if (Number(reportCount?.count ?? 0) === 0) {
    await execute(
      `INSERT INTO product_reports (product_id, reported_user_id, reporter_id, reason, details, status)
       VALUES (?, ?, ?, 'Misleading price', 'The advertised price appears much lower than the market average. Please verify.', 'open')`,
      [productIds.tomatoesKigali ?? null, seller2Id, secondBuyerId],
    );
  }

  const announcementCount = await queryOne<RowDataPacket>(
    "SELECT COUNT(*) AS count FROM announcements WHERE title = ?",
    ["Welcome to the ISOKOLINK RWANDA marketplace"],
  );
  if (Number(announcementCount?.count ?? 0) === 0) {
    await execute(
      `INSERT INTO announcements (title, body, audience, is_published, published_at, created_by)
       VALUES (?, ?, 'all', 1, UTC_TIMESTAMP(), ?)`,
      [
        "Welcome to the ISOKOLINK RWANDA marketplace",
        "We connect food buyers and sellers across Rwanda. Products are reviewed by our team before they appear publicly. Compare seller-advertised prices with independently collected market observations, and always confirm details with the seller.",
        adminId,
      ],
    );
  }

  const auditCount = await queryOne<RowDataPacket>("SELECT COUNT(*) AS count FROM audit_logs");
  if (Number(auditCount?.count ?? 0) === 0 && productIds.tomatoes) {
    await execute(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
       VALUES (?, 'product.approved', 'product', ?, ?)`,
      [adminId, String(productIds.tomatoes), JSON.stringify({ source: "seed" })],
    );
  }

  console.log("[seed] complete");
  console.log("[seed] demo accounts (development only):");
  console.log("  admin  → admin@isokolink.rw  / Password123!");
  console.log("  buyer  → buyer@example.com   / Password123!");
  console.log("  seller → seller@example.com  / Password123!");
  console.log("  seller → seller2@example.com / Password123!");
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed] failed:", error);
    process.exit(1);
  });
