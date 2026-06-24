const pptxgen = require('C:/Users/APC/AppData/Roaming/npm/node_modules/pptxgenjs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = 'Rwandamotor Ltd IT';
pres.title = 'Rwandamotor DMS — Complete User Guide';

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  navy:   '1E293B',
  white:  'FFFFFF',
  green:  '10B981',
  amber:  'F59E0B',
  orange: 'F97316',
  red:    'EF4444',
  blue:   '3B82F6',
  purple: '8B5CF6',
  slate:  '64748B',
  light:  'F1F5F9',
  muted:  '94A3B8',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeShadow = () => ({ type: 'outer', color: '000000', blur: 8, offset: 2, angle: 45, opacity: 0.10 });

function card(slide, x, y, w, h, fillColor) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: fillColor || C.white },
    line: { color: 'E2E8F0', width: 0.5 },
    rectRadius: 0.12,
    shadow: makeShadow(),
  });
}

// Role chip colors
const ROLE_COLOR = { Admin: C.purple, CRM: C.blue, TD: C.orange, CRE: C.green };

function roleChip(slide, roles, x, y) {
  let cx = x;
  for (const r of roles) {
    const w = r.length * 0.11 + 0.22;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y, w, h: 0.22, fill: { color: ROLE_COLOR[r] || C.slate }, rectRadius: 0.08 });
    slide.addText(r, { x: cx, y, w, h: 0.22, fontSize: 7, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    cx += w + 0.08;
  }
}

function sectionDivider(slide, num, title, subtitle) {
  slide.background = { color: C.navy };
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.6, h: 5.625, fill: { color: C.green } });
  slide.addText(num, { x: 0.9, y: 0.6, w: 8, h: 0.5, fontSize: 13, color: C.green, bold: true, charSpacing: 4 });
  slide.addText(title, { x: 0.9, y: 1.2, w: 8.2, h: 1.8, fontSize: 40, color: C.white, bold: true });
  if (subtitle) slide.addText(subtitle, { x: 0.9, y: 3.1, w: 8, h: 0.6, fontSize: 16, color: C.muted });
}

function contentSlide(slide, title, roles) {
  slide.background = { color: C.white };
  // top accent bar
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.07, fill: { color: C.navy } });
  slide.addText(title, { x: 0.5, y: 0.18, w: 8.5, h: 0.62, fontSize: 24, color: C.navy, bold: true });
  // slide bottom
  slide.addText('Rwandamotor DMS', { x: 0.5, y: 5.35, w: 6, h: 0.2, fontSize: 8, color: C.muted });
  if (roles && roles.length) roleChip(slide, roles, 7.8, 5.32);
}

// ─────────────────────────────────────────────────────────────────────────────
//  SLIDE 1 — Title
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  // left green strip
  slide_addGreenStrip(s);
  s.addText('Rwandamotor DMS', { x: 0.9, y: 1.0, w: 8.2, h: 1.2, fontSize: 48, color: C.white, bold: true });
  s.addText('Your All-in-One Dealer Management System', { x: 0.9, y: 2.25, w: 8, h: 0.6, fontSize: 20, color: C.green });
  s.addText('"From vehicle reception to customer retention — everything in one place"', {
    x: 0.9, y: 3.1, w: 8, h: 0.55, fontSize: 13, color: C.muted, italic: true,
  });
  s.addText('Rwandamotor Ltd  ·  app.rwandamotor.com', { x: 0.9, y: 5.1, w: 8, h: 0.3, fontSize: 10, color: C.slate });
}

function slide_addGreenStrip(s) {
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.6, h: 5.625, fill: { color: C.green } });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SLIDE 2 — Table of Contents
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  contentSlide(s, 'Table of Contents');
  const sections = [
    ['01', 'Introduction', '3–5'],
    ['02', 'Getting Started', '6–8'],
    ['03', 'Vehicles', '9–11'],
    ['04', 'Customers', '12–13'],
    ['05', 'Job Cards', '14–18'],
    ['06', 'Follow-Ups', '19–22'],
    ['07', 'Appointments', '23–25'],
    ['08', 'Retention & Reports', '26–28'],
    ['09', 'Admin Functions', '29–32'],
    ['10', 'Notifications', '33–34'],
    ['11', 'Import Center', '35'],
    ['12', 'Tips & Daily Routine', '36–37'],
  ];
  const col1 = sections.slice(0, 6);
  const col2 = sections.slice(6);
  const startY = 1.05, rowH = 0.6;
  [col1, col2].forEach((col, ci) => {
    const bx = ci === 0 ? 0.5 : 5.2;
    col.forEach(([num, title, pg], i) => {
      const y = startY + i * rowH;
      card(s, bx, y, 4.4, 0.5, C.light);
      s.addText(num, { x: bx + 0.12, y, w: 0.45, h: 0.5, fontSize: 11, color: C.green, bold: true, valign: 'middle', margin: 0 });
      s.addText(title, { x: bx + 0.58, y, w: 3.0, h: 0.5, fontSize: 12, color: C.navy, bold: true, valign: 'middle', margin: 0 });
      s.addText(`Slide ${pg}`, { x: bx + 3.6, y, w: 0.7, h: 0.5, fontSize: 9, color: C.muted, valign: 'middle', align: 'right', margin: 0 });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 1 DIVIDER — Introduction
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  sectionDivider(s, 'SECTION 01', 'Introduction', 'What is the DMS and who uses it?');
}

// ─────────────────────────────────────────────────────────────────────────────
//  SLIDE 3 — What is the DMS?
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  contentSlide(s, 'What is the DMS?');
  const bullets = [
    'A custom-built platform made exclusively for Rwandamotor Ltd',
    'Replaces paper job cards, spreadsheets, and manual follow-up calls',
    'Accessible from any computer or browser — no installation needed',
    'Web address:  app.rwandamotor.com',
    'Secure login required — each user has their own account',
  ];
  const iconColors = [C.blue, C.green, C.amber, C.orange, C.purple];
  bullets.forEach((b, i) => {
    const y = 1.1 + i * 0.82;
    card(s, 0.5, y, 9.0, 0.65, C.white);
    s.addShape(pres.shapes.OVAL, { x: 0.65, y: y + 0.125, w: 0.4, h: 0.4, fill: { color: iconColors[i] } });
    s.addText(String(i + 1), { x: 0.65, y: y + 0.125, w: 0.4, h: 0.4, fontSize: 11, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(b, { x: 1.2, y, w: 8.1, h: 0.65, fontSize: 13, color: C.navy, valign: 'middle', margin: 0 });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SLIDE 4 — What Can You Do With It?
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  contentSlide(s, 'Everything in One System');
  const rows = [
    ['Register vehicles & customers', 'Track service history'],
    ['Open & close job cards', 'Send follow-up calls & emails'],
    ['Book service appointments', 'View retention reports'],
    ['Generate delivery notes', 'Manage team users'],
    ['Import bulk vehicle data', 'Export monthly reports (PDF / Excel)'],
  ];
  const colX = [0.5, 5.25];
  rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const y = 1.05 + ri * 0.83;
      card(s, colX[ci], y, 4.55, 0.68, ci === 0 ? 'EFF6FF' : 'F0FDF4');
      s.addShape(pres.shapes.OVAL, { x: colX[ci] + 0.15, y: y + 0.14, w: 0.38, h: 0.38, fill: { color: ci === 0 ? C.blue : C.green } });
      s.addText('✓', { x: colX[ci] + 0.15, y: y + 0.14, w: 0.38, h: 0.38, fontSize: 11, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
      s.addText(cell, { x: colX[ci] + 0.65, y, w: 3.75, h: 0.68, fontSize: 12, color: C.navy, valign: 'middle', margin: 0 });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SLIDE 5 — Who Uses It? (4 roles)
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  contentSlide(s, '4 User Roles — Each Sees What They Need');
  const roles = [
    { title: 'Admin', color: C.purple, desc: 'Full access to everything. Manages users, settings, and can see all data.' },
    { title: 'CRM Officer', color: C.blue, desc: 'Manages vehicles, customers, job cards, follow-ups, and appointments.' },
    { title: 'Technical Director', color: C.orange, desc: 'Oversees job cards, service records, appointments, and workshop reports.' },
    { title: 'CRE', color: C.green, desc: 'Handles customer outreach, follow-up calls, and appointment booking.' },
  ];
  roles.forEach((r, i) => {
    const x = 0.4 + i * 2.32;
    card(s, x, 1.05, 2.18, 3.8, C.white);
    s.addShape(pres.shapes.OVAL, { x: x + 0.64, y: 1.25, w: 0.9, h: 0.9, fill: { color: r.color } });
    s.addText(r.title.charAt(0), { x: x + 0.64, y: 1.25, w: 0.9, h: 0.9, fontSize: 26, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(r.title, { x: x + 0.1, y: 2.25, w: 1.98, h: 0.45, fontSize: 13, color: r.color, bold: true, align: 'center' });
    s.addText(r.desc, { x: x + 0.12, y: 2.72, w: 1.94, h: 1.9, fontSize: 10.5, color: C.slate, align: 'center' });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 2 DIVIDER — Getting Started
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  sectionDivider(s, 'SECTION 02', 'Getting Started', 'Login, Dashboard & Navigation');
}

// ─────────────────────────────────────────────────────────────────────────────
//  SLIDE 6 — How to Log In
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  contentSlide(s, 'Logging In');
  const steps = [
    'Open your browser (Chrome recommended)',
    'Go to  app.rwandamotor.com',
    'Enter your email address and password',
    'Click  Sign In',
    'You are taken directly to your Dashboard',
  ];
  steps.forEach((st, i) => {
    const y = 1.05 + i * 0.83;
    card(s, 0.5, y, 9.0, 0.68, i % 2 === 0 ? C.white : C.light);
    s.addShape(pres.shapes.OVAL, { x: 0.65, y: y + 0.14, w: 0.38, h: 0.38, fill: { color: C.navy } });
    s.addText(String(i + 1), { x: 0.65, y: y + 0.14, w: 0.38, h: 0.38, fontSize: 12, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(st, { x: 1.2, y, w: 8.1, h: 0.68, fontSize: 13, color: C.navy, valign: 'middle', margin: 0 });
  });
  s.addText('💡  If you forget your password, contact your Admin to reset it.', {
    x: 0.5, y: 5.15, w: 9, h: 0.28, fontSize: 9.5, color: C.slate, italic: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SLIDE 7 — The Dashboard
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  contentSlide(s, 'Your Personalised Dashboard', ['Admin', 'CRM', 'TD', 'CRE']);
  const items = [
    { role: 'Admin & CRM Officer', color: C.purple, desc: 'Retention stats, vehicle status, follow-up counts, open job cards, retention trend charts, brand-by-brand breakdown' },
    { role: 'Technical Director', color: C.orange, desc: 'Job card counts, service activity, appointment overview' },
    { role: 'CRE', color: C.green, desc: 'My Work section with quick links to Follow-ups and Appointments' },
  ];
  s.addText('The first thing you see after login is your Dashboard — showing a personalised greeting and your role\'s key data. Numbers refresh every 5 minutes.', {
    x: 0.5, y: 1.05, w: 9, h: 0.55, fontSize: 12, color: C.slate,
  });
  items.forEach((it, i) => {
    const y = 1.75 + i * 1.1;
    card(s, 0.5, y, 9.0, 0.92, C.light);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.65, y: y + 0.24, w: 1.4, h: 0.38, fill: { color: it.color }, rectRadius: 0.08 });
    s.addText(it.role, { x: 0.65, y: y + 0.24, w: 1.4, h: 0.38, fontSize: 9, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(it.desc, { x: 2.2, y, w: 7.1, h: 0.92, fontSize: 11.5, color: C.navy, valign: 'middle', margin: 0 });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SLIDE 8 — Navigating the System
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  contentSlide(s, 'The Sidebar Menu');
  const tips = [
    { icon: '☰', title: 'Main Navigation', desc: 'The left sidebar is your primary way to move between sections of the system.' },
    { icon: '«', title: 'Collapse for Space', desc: 'Click the arrow button to collapse the sidebar to icons — giving you more screen space.' },
    { icon: '⊟', title: 'Mobile / Small Screens', desc: 'On a smaller screen, tap the hamburger icon (☰) at the top to open the menu.' },
    { icon: '👁', title: 'Role-Based Menu', desc: 'Items shown depend on your role — you only see the sections relevant to you.' },
  ];
  tips.forEach((t, i) => {
    const x = i < 2 ? 0.4 : 0.4;
    const row = i < 2 ? 0 : 1;
    const col = i % 2;
    const cx = 0.4 + col * 4.75;
    const cy = 1.1 + row * 2.1;
    card(s, cx, cy, 4.45, 1.85, C.white);
    s.addShape(pres.shapes.OVAL, { x: cx + 0.2, y: cy + 0.2, w: 0.7, h: 0.7, fill: { color: C.navy } });
    s.addText(t.icon, { x: cx + 0.2, y: cy + 0.2, w: 0.7, h: 0.7, fontSize: 18, color: C.white, align: 'center', valign: 'middle', margin: 0 });
    s.addText(t.title, { x: cx + 1.05, y: cy + 0.2, w: 3.2, h: 0.4, fontSize: 13, color: C.navy, bold: true, valign: 'middle', margin: 0 });
    s.addText(t.desc, { x: cx + 0.15, y: cy + 0.7, w: 4.15, h: 1.0, fontSize: 11, color: C.slate });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 3 — Vehicles
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  sectionDivider(s, 'SECTION 03', 'Vehicles', 'Managing vehicle records and history');
}

// SLIDE 9 — Vehicle List
{
  const s = pres.addSlide();
  contentSlide(s, 'Managing Vehicles', ['Admin', 'CRM', 'TD']);
  s.addText('Go to Vehicles in the sidebar. Search by plate number, VIN, or customer name. Filter by Brand, Retention Status, or Warranty.', {
    x: 0.5, y: 1.05, w: 9, h: 0.48, fontSize: 12, color: C.slate,
  });
  const statuses = [
    { label: 'Active', color: C.green, desc: 'Serviced within schedule' },
    { label: 'Due Soon', color: C.amber, desc: 'Service coming up soon' },
    { label: 'Overdue', color: C.orange, desc: 'Service is overdue' },
    { label: 'Lost', color: C.red, desc: 'Not returned in 12+ months' },
    { label: 'Recovered', color: C.blue, desc: 'Lost customer who returned' },
  ];
  s.addText('Colour-Coded Retention Status Badges:', { x: 0.5, y: 1.62, w: 9, h: 0.35, fontSize: 13, color: C.navy, bold: true });
  statuses.forEach((st, i) => {
    const y = 2.05 + i * 0.67;
    card(s, 0.5, y, 9.0, 0.57, C.white);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.65, y: y + 0.12, w: 1.1, h: 0.32, fill: { color: st.color }, rectRadius: 0.08 });
    s.addText(st.label, { x: 0.65, y: y + 0.12, w: 1.1, h: 0.32, fontSize: 10, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(st.desc, { x: 1.9, y, w: 7.4, h: 0.57, fontSize: 12, color: C.navy, valign: 'middle', margin: 0 });
  });
}

// SLIDE 10 — Vehicle 360 Profile
{
  const s = pres.addSlide();
  contentSlide(s, 'Full Vehicle History in One Place', ['Admin', 'CRM', 'TD']);
  s.addText('Click on any vehicle to open its 360 Profile — a complete view of everything related to that vehicle.', {
    x: 0.5, y: 1.05, w: 9, h: 0.45, fontSize: 12, color: C.slate,
  });
  const fields = [
    ['Owner Details', 'Customer name, phone, and email address'],
    ['Service Timeline', 'All service dates, mileage at service, and technician assigned'],
    ['Job Cards', 'Every job card ever opened for this vehicle'],
    ['Follow-up History', 'All outreach calls and outcomes recorded'],
    ['Warranty & Mileage', 'Current mileage, warranty start and end dates'],
    ['Retention Status', 'Current status and next service due date'],
  ];
  fields.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = col === 0 ? 0.5 : 5.25;
    const y = 1.65 + row * 1.2;
    card(s, x, y, 4.55, 1.0, C.light);
    s.addText(f[0], { x: x + 0.15, y: y + 0.1, w: 4.25, h: 0.35, fontSize: 12, color: C.navy, bold: true, margin: 0 });
    s.addText(f[1], { x: x + 0.15, y: y + 0.45, w: 4.25, h: 0.48, fontSize: 10.5, color: C.slate, margin: 0 });
  });
}

// SLIDE 11 — Editing a Vehicle
{
  const s = pres.addSlide();
  contentSlide(s, 'Updating Vehicle Information', ['Admin', 'CRM']);
  const steps = [
    'Open the Vehicle 360 profile page',
    'Click  Edit Vehicle  in the top right',
    'Update the relevant fields (plate number, mileage, colour, fuel type, warranty dates, service policy, notes)',
    'Click  Save  when done',
    'Changes are logged automatically in the activity log',
  ];
  steps.forEach((st, i) => {
    const y = 1.05 + i * 0.83;
    card(s, 0.5, y, 9.0, 0.68, i % 2 === 0 ? C.white : C.light);
    s.addShape(pres.shapes.OVAL, { x: 0.65, y: y + 0.14, w: 0.38, h: 0.38, fill: { color: C.blue } });
    s.addText(String(i + 1), { x: 0.65, y: y + 0.14, w: 0.38, h: 0.38, fontSize: 12, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(st, { x: 1.2, y, w: 8.1, h: 0.68, fontSize: 12.5, color: C.navy, valign: 'middle', margin: 0 });
  });
  s.addText('⚠  VIN and brand/model cannot be changed after registration. Contact Admin if a correction is needed.', {
    x: 0.5, y: 5.15, w: 9, h: 0.28, fontSize: 9.5, color: C.orange, italic: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 4 — Customers
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  sectionDivider(s, 'SECTION 04', 'Customers', 'Customer records and 360 profiles');
}

// SLIDE 12 — Customer List
{
  const s = pres.addSlide();
  contentSlide(s, 'Customer Records', ['Admin', 'CRM']);
  const bullets = [
    'Go to Customers in the sidebar',
    'See all customers with: name, phone, email, category (Retail, Corporate, Government, VIP), and number of vehicles',
    'Search by name, phone, or email address',
    'Filter by customer category',
    'Click  New Customer  (top right) to register a new customer',
  ];
  bullets.forEach((b, i) => {
    const y = 1.05 + i * 0.83;
    card(s, 0.5, y, 9.0, 0.68, i % 2 === 0 ? C.white : C.light);
    s.addShape(pres.shapes.OVAL, { x: 0.65, y: y + 0.14, w: 0.38, h: 0.38, fill: { color: C.green } });
    s.addText('✓', { x: 0.65, y: y + 0.14, w: 0.38, h: 0.38, fontSize: 14, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(b, { x: 1.2, y, w: 8.1, h: 0.68, fontSize: 12.5, color: C.navy, valign: 'middle', margin: 0 });
  });
}

// SLIDE 13 — Customer 360 Profile
{
  const s = pres.addSlide();
  contentSlide(s, 'Customer History at a Glance', ['Admin', 'CRM']);
  s.addText('Click any customer to see their complete profile — all vehicles, history, and contact preferences in one place.', {
    x: 0.5, y: 1.05, w: 9, h: 0.45, fontSize: 12, color: C.slate,
  });
  const items = [
    ['All Vehicles', 'Every vehicle registered to this customer'],
    ['Full Service History', 'Service records across all their vehicles'],
    ['Job Cards', 'All job cards opened for this customer\'s vehicles'],
    ['Preferred Contact', 'Phone, WhatsApp, or Email — how they like to be reached'],
    ['Category & Company', 'Retail, Corporate, Government, or VIP; company name if applicable'],
    ['Edit Button', 'Update contact details any time — changes are logged'],
  ];
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = col === 0 ? 0.5 : 5.25;
    const y = 1.65 + row * 1.2;
    card(s, x, y, 4.55, 1.0, col === 0 ? 'EFF6FF' : 'F0FDF4');
    s.addText(it[0], { x: x + 0.15, y: y + 0.1, w: 4.25, h: 0.35, fontSize: 12, color: C.navy, bold: true, margin: 0 });
    s.addText(it[1], { x: x + 0.15, y: y + 0.45, w: 4.25, h: 0.48, fontSize: 10.5, color: C.slate, margin: 0 });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 5 — Job Cards
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  sectionDivider(s, 'SECTION 05', 'Job Cards', 'Workshop intake records — from reception to delivery');
}

// SLIDE 14 — What is a Job Card?
{
  const s = pres.addSlide();
  contentSlide(s, 'Job Cards — Workshop Intake Records', ['Admin', 'CRM', 'TD']);
  s.addText('A Job Card is opened every time a vehicle is received in the workshop.', {
    x: 0.5, y: 1.05, w: 9, h: 0.4, fontSize: 13, color: C.slate,
  });
  const fields = [
    'Vehicle (VIN / plate number)', 'Owner name and phone',
    'Fuel level and mileage at reception', 'Type of service requested',
    'Accessories present (jack, spare tyre, fire extinguisher …)', 'Assigned technician and notes',
  ];
  fields.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = col === 0 ? 0.5 : 5.25;
    const y = 1.58 + row * 1.1;
    card(s, x, y, 4.55, 0.88, C.light);
    s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: y + 0.24, w: 0.38, h: 0.38, fill: { color: C.navy } });
    s.addText('✓', { x: x + 0.15, y: y + 0.24, w: 0.38, h: 0.38, fontSize: 13, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(f, { x: x + 0.65, y, w: 3.75, h: 0.88, fontSize: 11.5, color: C.navy, valign: 'middle', margin: 0 });
  });
  card(s, 0.5, 4.95, 9.0, 0.42, 'FFF7ED');
  s.addText('Each job card gets an automatic reference number:  OR-YYYY-NNNNN  (e.g. OR-2600001)', {
    x: 0.65, y: 4.95, w: 8.7, h: 0.42, fontSize: 12, color: C.orange, bold: true, valign: 'middle', margin: 0,
  });
}

// SLIDE 15 — Opening a New Job Card
{
  const s = pres.addSlide();
  contentSlide(s, 'How to Open a Job Card', ['Admin', 'CRM', 'TD']);
  const steps = [
    'Go to Job Cards in the sidebar',
    'Click New Job Card (top right)',
    'Search for the vehicle by plate number or VIN',
    'Customer details load automatically',
    'Enter: service type, fuel level, current mileage',
    'Check off accessories present in the vehicle',
    'Assign a technician',
    'Add notes or special instructions',
    'Click Create — the job card opens with its auto-generated number',
  ];
  const col1 = steps.slice(0, 5), col2 = steps.slice(5);
  [col1, col2].forEach((col, ci) => {
    col.forEach((st, i) => {
      const num = ci === 0 ? i + 1 : i + 6;
      const y = 1.05 + i * 0.83;
      const x = ci === 0 ? 0.4 : 5.1;
      card(s, x, y, 4.55, 0.68, num % 2 === 0 ? C.light : C.white);
      s.addShape(pres.shapes.OVAL, { x: x + 0.12, y: y + 0.14, w: 0.38, h: 0.38, fill: { color: C.navy } });
      s.addText(String(num), { x: x + 0.12, y: y + 0.14, w: 0.38, h: 0.38, fontSize: 11, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
      s.addText(st, { x: x + 0.62, y, w: 3.8, h: 0.68, fontSize: 11, color: C.navy, valign: 'middle', margin: 0 });
    });
  });
}

// SLIDE 16 — Job Card List & Filters
{
  const s = pres.addSlide();
  contentSlide(s, 'Finding and Managing Job Cards', ['Admin', 'CRM', 'TD']);
  s.addText('The job card list shows all cards with their key details. Use search and filters to find what you need quickly.', {
    x: 0.5, y: 1.05, w: 9, h: 0.45, fontSize: 12, color: C.slate,
  });
  const cols = [
    { label: 'Columns Shown', color: C.navy, items: ['Job card number', 'Vehicle & customer', 'Service type', 'Status (Open / Closed)', 'Mileage & technician', 'Date'] },
    { label: 'Filter Options', color: C.blue, items: ['Status: Open / Closed', 'Service type', 'Date range'] },
    { label: 'Search By', color: C.green, items: ['Vehicle plate number', 'VIN', 'Customer name'] },
  ];
  cols.forEach((col, i) => {
    const x = 0.4 + i * 3.15;
    card(s, x, 1.65, 3.0, 3.5, C.white);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.12, y: 1.72, w: 2.76, h: 0.42, fill: { color: col.color }, rectRadius: 0.08 });
    s.addText(col.label, { x: x + 0.12, y: 1.72, w: 2.76, h: 0.42, fontSize: 12, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    col.items.forEach((it, j) => {
      s.addText('— ' + it, { x: x + 0.2, y: 2.25 + j * 0.47, w: 2.65, h: 0.4, fontSize: 11, color: C.navy, margin: 0 });
    });
  });
  s.addText('Click any row to open the full job card detail page.', {
    x: 0.5, y: 5.2, w: 9, h: 0.25, fontSize: 10, color: C.muted, italic: true,
  });
}

// SLIDE 17 — Converting to Delivery Note
{
  const s = pres.addSlide();
  contentSlide(s, 'Closing a Job Card — Generating the Delivery Note', ['Admin', 'CRM', 'TD']);
  const steps = [
    'Open the job card',
    'When work is complete, click  Convert to Delivery Note',
    'Confirm the action',
    'System creates delivery note number (DN-YYYY-NNNNN)',
    'System creates a service record for the vehicle',
    'Vehicle\'s last service date is updated automatically',
    'Job card is closed — a success message shows the delivery note number',
  ];
  steps.forEach((st, i) => {
    const y = 1.05 + i * 0.63;
    card(s, 0.5, y, 9.0, 0.54, i % 2 === 0 ? C.white : C.light);
    s.addShape(pres.shapes.OVAL, { x: 0.65, y: y + 0.08, w: 0.38, h: 0.38, fill: { color: i < 3 ? C.navy : C.green } });
    s.addText(String(i + 1), { x: 0.65, y: y + 0.08, w: 0.38, h: 0.38, fontSize: 11, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(st, { x: 1.2, y, w: 8.1, h: 0.54, fontSize: 12, color: C.navy, valign: 'middle', margin: 0 });
  });
  s.addText('⚠  This action cannot be undone. Only convert when the vehicle is ready to be handed back to the customer.', {
    x: 0.5, y: 5.28, w: 9, h: 0.25, fontSize: 9, color: C.orange, italic: true,
  });
}

// SLIDE 18 — Printing & Sharing Job Cards
{
  const s = pres.addSlide();
  contentSlide(s, 'Print and Share Job Cards', ['Admin', 'CRM', 'TD']);
  const options = [
    {
      icon: '🖨', title: 'Print', color: C.navy,
      desc: 'Click the Print button on any open job card. A clean print view opens with company letterhead, vehicle details, accessories checklist, and a signature line.',
    },
    {
      icon: '✉', title: 'Email', color: C.blue,
      desc: 'Click Share, enter the customer\'s email address, add an optional message, and click Send. The customer receives a professional HTML email.',
    },
  ];
  options.forEach((opt, i) => {
    const y = 1.2 + i * 2.05;
    card(s, 0.5, y, 9.0, 1.8, i === 0 ? C.light : 'EFF6FF');
    s.addShape(pres.shapes.OVAL, { x: 0.7, y: y + 0.5, w: 0.8, h: 0.8, fill: { color: opt.color } });
    s.addText(opt.icon, { x: 0.7, y: y + 0.5, w: 0.8, h: 0.8, fontSize: 22, align: 'center', valign: 'middle', margin: 0 });
    s.addText(opt.title, { x: 1.7, y: y + 0.2, w: 7.1, h: 0.45, fontSize: 16, color: opt.color, bold: true, margin: 0 });
    s.addText(opt.desc, { x: 1.7, y: y + 0.65, w: 7.1, h: 1.0, fontSize: 12, color: C.navy, margin: 0 });
  });
  s.addText('The print view includes company name, TIN number, and job card number automatically.', {
    x: 0.5, y: 5.2, w: 9, h: 0.28, fontSize: 9.5, color: C.muted, italic: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 6 — Follow-ups
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  sectionDivider(s, 'SECTION 06', 'Follow-Ups', 'Proactive customer outreach and call logging');
}

// SLIDE 19 — What are Follow-ups?
{
  const s = pres.addSlide();
  contentSlide(s, 'Follow-Ups — Proactive Customer Outreach', ['Admin', 'CRM', 'CRE']);
  s.addText('Follow-ups are tasks created for the CRM/CRE team to call customers. The system creates them automatically based on vehicle service status.', {
    x: 0.5, y: 1.05, w: 9, h: 0.5, fontSize: 12, color: C.slate,
  });
  const types = [
    { label: 'Service Due Reminder', color: C.orange, desc: 'Vehicle is Overdue for service — call the customer to bring it in.' },
    { label: 'Service Due in 15 Days', color: C.amber, desc: 'Customer needs an advance reminder to book their appointment.' },
    { label: 'Lost Recovery', color: C.red, desc: 'Customer has not been back in 12+ months — reach out and re-engage.' },
  ];
  types.forEach((t, i) => {
    const y = 1.72 + i * 1.1;
    card(s, 0.5, y, 9.0, 0.92, C.white);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.65, y: y + 0.28, w: 2.1, h: 0.35, fill: { color: t.color }, rectRadius: 0.08 });
    s.addText(t.label, { x: 0.65, y: y + 0.28, w: 2.1, h: 0.35, fontSize: 9, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(t.desc, { x: 2.9, y, w: 6.4, h: 0.92, fontSize: 12, color: C.navy, valign: 'middle', margin: 0 });
  });
  card(s, 0.5, 5.05, 9.0, 0.38, 'F0FDF4');
  s.addText('The system auto-generates follow-ups every night. Click  Sync Follow-ups  to generate them immediately without waiting.', {
    x: 0.65, y: 5.05, w: 8.7, h: 0.38, fontSize: 10.5, color: C.green, bold: true, valign: 'middle', margin: 0,
  });
}

// SLIDE 20 — The Follow-up List
{
  const s = pres.addSlide();
  contentSlide(s, 'Your Follow-Up Queue', ['Admin', 'CRM', 'CRE']);
  s.addText('Go to Follow-ups in the sidebar to see your active queue.', {
    x: 0.5, y: 1.05, w: 9, h: 0.38, fontSize: 12, color: C.slate,
  });
  const cols = [
    { label: 'Columns Shown', color: C.navy, items: ['Vehicle plate & brand', 'Customer name & phone', 'Reason (Service Due / Lost Recovery)', 'Status (Pending / Contacted / Booked)', 'Priority (Low / Medium / High / Critical)', 'Due date'] },
    { label: 'Actions Available', color: C.green, items: ['Filter by reason or status', 'Search by plate, name, or phone', 'Click any row to open the detail page', 'Sync Follow-ups button — refresh now'] },
  ];
  cols.forEach((col, i) => {
    const x = i === 0 ? 0.4 : 5.15;
    card(s, x, 1.5, 4.55, 3.8, C.white);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.12, y: 1.57, w: 4.3, h: 0.42, fill: { color: col.color }, rectRadius: 0.08 });
    s.addText(col.label, { x: x + 0.12, y: 1.57, w: 4.3, h: 0.42, fontSize: 12, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    col.items.forEach((it, j) => {
      s.addText('— ' + it, { x: x + 0.2, y: 2.1 + j * 0.53, w: 4.2, h: 0.46, fontSize: 11, color: C.navy, margin: 0 });
    });
  });
}

// SLIDE 21 — Opening a Follow-up & Logging a Call
{
  const s = pres.addSlide();
  contentSlide(s, 'How to Handle a Follow-Up', ['Admin', 'CRM', 'CRE']);
  const steps = [
    'Click on a follow-up to open its detail page',
    'Review full vehicle and customer information',
    'Call the customer',
    'Click  Log Interaction  and record the outcome (Contacted, No Answer, Appointment Booked, Declined, etc.)',
    'Add notes about the conversation and a next contact date if needed',
    'Save — the follow-up status updates automatically based on the outcome',
  ];
  steps.forEach((st, i) => {
    const y = 1.05 + i * 0.75;
    card(s, 0.5, y, 9.0, 0.62, i % 2 === 0 ? C.white : C.light);
    s.addShape(pres.shapes.OVAL, { x: 0.65, y: y + 0.12, w: 0.38, h: 0.38, fill: { color: C.blue } });
    s.addText(String(i + 1), { x: 0.65, y: y + 0.12, w: 0.38, h: 0.38, fontSize: 11, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(st, { x: 1.2, y, w: 8.1, h: 0.62, fontSize: 12, color: C.navy, valign: 'middle', margin: 0 });
  });
}

// SLIDE 22 — Closing a Follow-up
{
  const s = pres.addSlide();
  contentSlide(s, 'When to Close a Follow-Up', ['Admin', 'CRM', 'CRE']);
  const reasons = [
    { icon: '✅', text: 'The customer has booked an appointment', color: C.green },
    { icon: '🔧', text: 'The customer has already serviced their vehicle elsewhere', color: C.blue },
    { icon: '🚫', text: 'The customer has declined — no further action needed', color: C.red },
  ];
  s.addText('Close a follow-up when one of these applies:', {
    x: 0.5, y: 1.05, w: 9, h: 0.38, fontSize: 13, color: C.navy, bold: true,
  });
  reasons.forEach((r, i) => {
    const y = 1.55 + i * 1.0;
    card(s, 0.5, y, 9.0, 0.82, C.white);
    s.addShape(pres.shapes.OVAL, { x: 0.65, y: y + 0.21, w: 0.4, h: 0.4, fill: { color: r.color } });
    s.addText(r.icon, { x: 0.65, y: y + 0.21, w: 0.4, h: 0.4, fontSize: 14, align: 'center', valign: 'middle', margin: 0 });
    s.addText(r.text, { x: 1.2, y, w: 8.1, h: 0.82, fontSize: 14, color: C.navy, valign: 'middle', margin: 0 });
  });
  s.addText('How: Click  Close Follow-up , add a final note, and save. Closed follow-ups are removed from your active queue.', {
    x: 0.5, y: 4.65, w: 9, h: 0.45, fontSize: 12, color: C.slate,
  });
  card(s, 0.5, 5.1, 9.0, 0.35, 'F0FDF4');
  s.addText('💡  When a vehicle gets a new delivery note, the system automatically updates their status to "Recovered."', {
    x: 0.65, y: 5.1, w: 8.7, h: 0.35, fontSize: 10, color: C.green, valign: 'middle', margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 7 — Appointments
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  sectionDivider(s, 'SECTION 07', 'Appointments', 'Booking and managing service appointments');
}

// SLIDE 23 — Appointments Calendar
{
  const s = pres.addSlide();
  contentSlide(s, 'Booking and Managing Appointments', ['Admin', 'CRM', 'TD', 'CRE']);
  s.addText('Go to Appointments in the sidebar. View a weekly calendar with all booked appointments. Navigate weeks with left/right arrows.', {
    x: 0.5, y: 1.05, w: 9, h: 0.48, fontSize: 12, color: C.slate,
  });
  s.addText('Appointment Statuses:', { x: 0.5, y: 1.62, w: 9, h: 0.38, fontSize: 13, color: C.navy, bold: true });
  const statuses = [
    { label: 'Scheduled', color: C.blue, desc: 'Booked — not yet confirmed' },
    { label: 'Confirmed', color: C.purple, desc: 'Confirmed by the team' },
    { label: 'Completed', color: C.green, desc: 'Vehicle has been serviced' },
    { label: 'Cancelled', color: C.red, desc: 'Appointment was cancelled' },
    { label: 'No-show', color: C.orange, desc: 'Customer did not arrive' },
  ];
  statuses.forEach((st, i) => {
    const y = 2.1 + i * 0.63;
    card(s, 0.5, y, 9.0, 0.54, i % 2 === 0 ? C.white : C.light);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.65, y: y + 0.1, w: 1.1, h: 0.32, fill: { color: st.color }, rectRadius: 0.08 });
    s.addText(st.label, { x: 0.65, y: y + 0.1, w: 1.1, h: 0.32, fontSize: 9, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(st.desc, { x: 1.9, y, w: 7.4, h: 0.54, fontSize: 12, color: C.navy, valign: 'middle', margin: 0 });
  });
}

// SLIDE 24 — Booking a New Appointment
{
  const s = pres.addSlide();
  contentSlide(s, 'How to Book an Appointment', ['Admin', 'CRM', 'CRE']);
  const steps = [
    'Click  New Appointment  (top right of the Appointments page)',
    'Search for the vehicle by plate number',
    'Select the vehicle — customer details load automatically',
    'Choose: date, time, service type, duration, and technician',
    'Add any notes',
    'Click  Book Appointment',
  ];
  steps.forEach((st, i) => {
    const y = 1.05 + i * 0.75;
    card(s, 0.5, y, 9.0, 0.62, i % 2 === 0 ? C.white : C.light);
    s.addShape(pres.shapes.OVAL, { x: 0.65, y: y + 0.12, w: 0.38, h: 0.38, fill: { color: C.blue } });
    s.addText(String(i + 1), { x: 0.65, y: y + 0.12, w: 0.38, h: 0.38, fontSize: 12, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(st, { x: 1.2, y, w: 8.1, h: 0.62, fontSize: 12.5, color: C.navy, valign: 'middle', margin: 0 });
  });
}

// SLIDE 25 — Managing Appointment Status
{
  const s = pres.addSlide();
  contentSlide(s, 'Updating Appointments on the Day', ['Admin', 'CRM', 'TD', 'CRE']);
  s.addText('Hover over any appointment card to reveal action buttons:', {
    x: 0.5, y: 1.05, w: 9, h: 0.38, fontSize: 13, color: C.navy, bold: true,
  });
  const actions = [
    { label: 'Confirm', color: C.purple, desc: 'Customer has confirmed they are coming in' },
    { label: 'Complete', color: C.green, desc: 'Vehicle has been serviced — mark as done' },
    { label: 'Cancel', color: C.red, desc: 'Appointment has been cancelled' },
    { label: 'No-show', color: C.orange, desc: 'Customer did not arrive at the appointed time' },
  ];
  actions.forEach((a, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = col === 0 ? 0.4 : 5.15;
    const y = 1.55 + row * 1.8;
    card(s, x, y, 4.55, 1.55, C.white);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.15, y: y + 0.18, w: 1.2, h: 0.42, fill: { color: a.color }, rectRadius: 0.1 });
    s.addText(a.label, { x: x + 0.15, y: y + 0.18, w: 1.2, h: 0.42, fontSize: 12, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(a.desc, { x: x + 0.15, y: y + 0.7, w: 4.25, h: 0.75, fontSize: 12, color: C.slate, margin: 0 });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 8 — Retention & Reports
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  sectionDivider(s, 'SECTION 08', 'Retention & Reports', 'Analytics, PDF/Excel reports, and the activity log');
}

// SLIDE 26 — Retention Analytics
{
  const s = pres.addSlide();
  contentSlide(s, 'Understanding Vehicle Retention', ['Admin', 'CRM', 'TD']);
  s.addText('Go to Retention in the sidebar. See how many of your service customers return for their next service.', {
    x: 0.5, y: 1.05, w: 9, h: 0.45, fontSize: 12, color: C.slate,
  });
  const metrics = [
    { label: 'Monthly Rate', color: C.green }, { label: 'Quarterly Rate', color: C.blue },
    { label: '6-Month Rate', color: C.purple }, { label: 'Annual Rate', color: C.amber },
  ];
  metrics.forEach((m, i) => {
    const x = 0.4 + i * 2.32;
    card(s, x, 1.62, 2.18, 1.1, C.white);
    s.addShape(pres.shapes.OVAL, { x: x + 0.64, y: 1.75, w: 0.9, h: 0.9, fill: { color: m.color } });
    s.addText('📊', { x: x + 0.64, y: 1.75, w: 0.9, h: 0.9, fontSize: 22, align: 'center', valign: 'middle', margin: 0 });
    s.addText(m.label, { x: x + 0.1, y: 2.65, w: 1.98, h: 0.35, fontSize: 11, color: m.color, bold: true, align: 'center' });
  });
  const insights = [
    'Charts show retention trend over time (month by month)',
    'Breakdown by brand: Toyota vs Suzuki vs others',
    'Cohort analysis: which sale year returns most often',
  ];
  insights.forEach((ins, i) => {
    const y = 2.9 + i * 0.68;
    card(s, 0.5, y, 9.0, 0.55, i % 2 === 0 ? C.light : C.white);
    s.addText('— ' + ins, { x: 0.7, y, w: 8.6, h: 0.55, fontSize: 12, color: C.navy, valign: 'middle', margin: 0 });
  });
  card(s, 0.5, 5.07, 9.0, 0.36, 'FFF7ED');
  s.addText('Retained ✅ = came back for service    At risk ⚠️ = overdue    Lost ❌ = 12+ months absent', {
    x: 0.65, y: 5.07, w: 8.7, h: 0.36, fontSize: 10.5, color: C.orange, valign: 'middle', margin: 0,
  });
}

// SLIDE 27 — Monthly Follow-up Report
{
  const s = pres.addSlide();
  contentSlide(s, 'Monthly Reporting — PDF & Excel Export', ['Admin', 'CRM', 'TD']);
  s.addText('Go to Reports → Follow-up Report. Select year and month.', {
    x: 0.5, y: 1.05, w: 9, h: 0.38, fontSize: 12, color: C.slate,
  });
  const metrics = [
    ['Total Follow-ups', 'Created that month'],
    ['Customers Contacted', 'How many were reached'],
    ['Appointments Booked', 'From follow-up calls'],
    ['Customers Recovered', 'Returned for service'],
  ];
  metrics.forEach((m, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = col === 0 ? 0.4 : 5.15;
    const y = 1.55 + row * 1.1;
    card(s, x, y, 4.55, 0.92, col === 0 ? 'EFF6FF' : 'F0FDF4');
    s.addText(m[0], { x: x + 0.15, y: y + 0.08, w: 4.25, h: 0.4, fontSize: 13, color: C.navy, bold: true, margin: 0 });
    s.addText(m[1], { x: x + 0.15, y: y + 0.48, w: 4.25, h: 0.36, fontSize: 11, color: C.slate, margin: 0 });
  });
  s.addText('Also includes: Contact rate %, Recovery rate %, breakdown by reason, and full interaction list.', {
    x: 0.5, y: 3.83, w: 9, h: 0.42, fontSize: 11, color: C.slate,
  });
  const exports = [
    { label: '📄  Download PDF', color: C.red, desc: 'Branded printable report' },
    { label: '📊  Download Excel', color: C.green, desc: 'For further analysis in spreadsheets' },
  ];
  exports.forEach((e, i) => {
    const x = i === 0 ? 0.4 : 5.15;
    card(s, x, 4.32, 4.55, 0.8, C.white);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.15, y: 4.5, w: 1.9, h: 0.38, fill: { color: e.color }, rectRadius: 0.1 });
    s.addText(e.label, { x: x + 0.15, y: 4.5, w: 1.9, h: 0.38, fontSize: 10, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(e.desc, { x: x + 2.2, y: 4.32, w: 2.2, h: 0.8, fontSize: 11, color: C.navy, valign: 'middle', margin: 0 });
  });
}

// SLIDE 28 — Activity Log
{
  const s = pres.addSlide();
  contentSlide(s, 'Who Did What — The Activity Log', ['Admin']);
  s.addText('Go to Activity Log in the sidebar. Every action in the system is recorded: who did it, what they did, and when.', {
    x: 0.5, y: 1.05, w: 9, h: 0.5, fontSize: 12, color: C.slate,
  });
  s.addText('Filter Options:', { x: 0.5, y: 1.65, w: 9, h: 0.38, fontSize: 13, color: C.navy, bold: true });
  const filters = ['User', 'Action type', 'Entity type', 'Date range'];
  filters.forEach((f, i) => {
    const x = 0.4 + i * 2.32;
    card(s, x, 2.1, 2.18, 0.72, C.light);
    s.addText(f, { x: x + 0.12, y: 2.1, w: 1.94, h: 0.72, fontSize: 12, color: C.navy, bold: true, align: 'center', valign: 'middle', margin: 0 });
  });
  s.addText('Use Cases:', { x: 0.5, y: 3.0, w: 9, h: 0.38, fontSize: 13, color: C.navy, bold: true });
  const uses = [
    'Audit changes made to vehicle or customer records',
    'Track who closed a job card or created a delivery note',
    'See who updated a follow-up or booked an appointment',
  ];
  uses.forEach((u, i) => {
    const y = 3.45 + i * 0.6;
    card(s, 0.5, y, 9.0, 0.5, i % 2 === 0 ? C.white : C.light);
    s.addShape(pres.shapes.OVAL, { x: 0.65, y: y + 0.06, w: 0.38, h: 0.38, fill: { color: C.purple } });
    s.addText('🔍', { x: 0.65, y: y + 0.06, w: 0.38, h: 0.38, fontSize: 13, align: 'center', valign: 'middle', margin: 0 });
    s.addText(u, { x: 1.2, y, w: 8.1, h: 0.5, fontSize: 12, color: C.navy, valign: 'middle', margin: 0 });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 9 — Admin Functions
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  sectionDivider(s, 'SECTION 09', 'Admin Functions', 'Users, permissions, settings, and catalogue');
}

// SLIDE 29 — Managing Users
{
  const s = pres.addSlide();
  contentSlide(s, 'Adding and Managing Team Members', ['Admin']);
  const groups = [
    {
      title: 'Create New User', color: C.green,
      steps: ['Go to Settings → Users', 'Click New User', 'Enter name, email, password, role', 'Optionally assign a Permission Group', 'Click Create'],
    },
    {
      title: 'Reset Password', color: C.blue,
      steps: ['Find the user in the list', 'Click Reset Password', 'Enter the new password', 'User can log in immediately'],
    },
    {
      title: 'Deactivate User', color: C.red,
      steps: ['Find the user', 'Click Edit', 'Toggle Active to off', 'Save — user can no longer log in'],
    },
  ];
  groups.forEach((g, gi) => {
    const x = 0.4 + gi * 3.15;
    card(s, x, 1.05, 3.0, 4.3, C.white);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.12, y: 1.12, w: 2.76, h: 0.42, fill: { color: g.color }, rectRadius: 0.08 });
    s.addText(g.title, { x: x + 0.12, y: 1.12, w: 2.76, h: 0.42, fontSize: 11, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    g.steps.forEach((st, i) => {
      s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: 1.67 + i * 0.63, w: 0.28, h: 0.28, fill: { color: g.color } });
      s.addText(String(i + 1), { x: x + 0.2, y: 1.67 + i * 0.63, w: 0.28, h: 0.28, fontSize: 9, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
      s.addText(st, { x: x + 0.58, y: 1.65 + i * 0.63, w: 2.3, h: 0.55, fontSize: 10, color: C.navy, valign: 'middle', margin: 0 });
    });
  });
}

// SLIDE 30 — Permission Groups
{
  const s = pres.addSlide();
  contentSlide(s, 'Custom Permission Groups', ['Admin']);
  s.addText('By default, each role has standard permissions. Create Permission Groups to customise what a specific team member can see and do.', {
    x: 0.5, y: 1.05, w: 9, h: 0.5, fontSize: 12, color: C.slate,
  });
  card(s, 0.5, 1.65, 4.3, 0.6, 'FFF7ED');
  s.addText('Example: Create a "Senior CRE" group that can also see the Retention analytics page.', {
    x: 0.65, y: 1.65, w: 4.1, h: 0.6, fontSize: 11, color: C.orange, valign: 'middle', margin: 0,
  });
  const steps = [
    'Go to Settings → Permission Groups',
    'Click New Group',
    'Name the group (e.g. "Senior CRE")',
    'Check / uncheck the permissions you want',
    'Click Save',
    'Go to Users → edit the user → assign the group',
  ];
  steps.forEach((st, i) => {
    const row = Math.floor(i / 2), col = i % 2;
    const x = col === 0 ? 5.2 : 5.2;
    const bx = 5.1 + col * 0;
    // put steps in right column
    const y = 1.65 + i * 0.63;
    if (i < 6) {
      card(s, 5.1, y, 4.55, 0.54, i % 2 === 0 ? C.light : C.white);
      s.addShape(pres.shapes.OVAL, { x: 5.25, y: y + 0.08, w: 0.32, h: 0.32, fill: { color: C.purple } });
      s.addText(String(i + 1), { x: 5.25, y: y + 0.08, w: 0.32, h: 0.32, fontSize: 10, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
      s.addText(st, { x: 5.68, y, w: 3.85, h: 0.54, fontSize: 11, color: C.navy, valign: 'middle', margin: 0 });
    }
  });
}

// SLIDE 31 — Company Settings
{
  const s = pres.addSlide();
  contentSlide(s, 'Setting Up Your Company Profile', ['Admin']);
  s.addText('Go to Settings → Company to configure your company profile and what appears on all printed documents.', {
    x: 0.5, y: 1.05, w: 9, h: 0.45, fontSize: 12, color: C.slate,
  });
  const settings = [
    { group: 'Company Details', items: 'Name, address, phone, email, TIN number, website' },
    { group: 'Job Card Printouts', items: 'Header, footer text, and disclaimer that appear on printed job cards' },
    { group: 'Delivery Note Printouts', items: 'Header and footer content for delivery note printouts' },
    { group: 'Email Messages', items: 'Custom message sent with job card emails and delivery note emails' },
  ];
  settings.forEach((g, i) => {
    const y = 1.62 + i * 0.92;
    card(s, 0.5, y, 9.0, 0.78, i % 2 === 0 ? C.light : C.white);
    s.addText(g.group, { x: 0.65, y: y + 0.08, w: 2.5, h: 0.35, fontSize: 12, color: C.navy, bold: true, margin: 0 });
    s.addText(g.items, { x: 3.3, y, w: 6.0, h: 0.78, fontSize: 11.5, color: C.slate, valign: 'middle', margin: 0 });
  });
  s.addText('These details appear automatically on every printed job card and delivery note.', {
    x: 0.5, y: 5.28, w: 9, h: 0.26, fontSize: 10, color: C.green, italic: true,
  });
}

// SLIDE 32 — Brand & Model Catalogue
{
  const s = pres.addSlide();
  contentSlide(s, 'Managing Brands and Models', ['Admin']);
  s.addText('Go to Settings → Catalogue to manage the list of car brands and models used when registering vehicles.', {
    x: 0.5, y: 1.05, w: 9, h: 0.45, fontSize: 12, color: C.slate,
  });
  const actions = [
    { icon: '➕', title: 'Add Brand / Model', desc: 'Register a new car brand or add a new model under an existing brand.' },
    { icon: '✏', title: 'Edit', desc: 'Update the name or details of an existing brand or model.' },
    { icon: '⊘', title: 'Deactivate', desc: 'Hide a model from new vehicle registration (existing vehicles are not affected).' },
    { icon: '📥', title: 'Bulk Import', desc: 'Import an entire model catalogue from an Excel file.' },
  ];
  actions.forEach((a, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = col === 0 ? 0.4 : 5.15;
    const y = 1.65 + row * 1.75;
    card(s, x, y, 4.55, 1.5, C.white);
    s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: y + 0.4, w: 0.7, h: 0.7, fill: { color: C.navy } });
    s.addText(a.icon, { x: x + 0.2, y: y + 0.4, w: 0.7, h: 0.7, fontSize: 20, align: 'center', valign: 'middle', margin: 0 });
    s.addText(a.title, { x: x + 1.1, y: y + 0.18, w: 3.3, h: 0.45, fontSize: 13, color: C.navy, bold: true, margin: 0 });
    s.addText(a.desc, { x: x + 1.1, y: y + 0.65, w: 3.3, h: 0.78, fontSize: 11, color: C.slate, margin: 0 });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 10 — Notifications
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  sectionDivider(s, 'SECTION 10', 'Notifications', 'Real-time alerts for every user');
}

// SLIDE 33 — The Notification Bell
{
  const s = pres.addSlide();
  contentSlide(s, 'Real-Time Notifications', ['Admin', 'CRM', 'TD', 'CRE']);
  s.addText('The bell icon 🔔 at the top right of every page shows your unread notifications. A red badge shows the count.', {
    x: 0.5, y: 1.05, w: 9, h: 0.48, fontSize: 12, color: C.slate,
  });
  s.addText('Notifications are created automatically for:', { x: 0.5, y: 1.62, w: 9, h: 0.38, fontSize: 13, color: C.navy, bold: true });
  const events = [
    { icon: '🔴', text: 'A customer\'s service is overdue', color: C.red },
    { icon: '🟡', text: 'A vehicle is due for service in 15 days', color: C.amber },
    { icon: '⚫', text: 'A customer has been marked as Lost', color: C.slate },
    { icon: '🔵', text: 'New appointments coming up', color: C.blue },
  ];
  events.forEach((e, i) => {
    const y = 2.1 + i * 0.75;
    card(s, 0.5, y, 9.0, 0.62, i % 2 === 0 ? C.white : C.light);
    s.addShape(pres.shapes.OVAL, { x: 0.65, y: y + 0.12, w: 0.38, h: 0.38, fill: { color: e.color } });
    s.addText(e.icon, { x: 0.65, y: y + 0.12, w: 0.38, h: 0.38, fontSize: 14, align: 'center', valign: 'middle', margin: 0 });
    s.addText(e.text, { x: 1.2, y, w: 8.1, h: 0.62, fontSize: 13, color: C.navy, valign: 'middle', margin: 0 });
  });
  s.addText('💡  Click any notification to go directly to the relevant follow-up or appointment.', {
    x: 0.5, y: 5.15, w: 9, h: 0.28, fontSize: 10, color: C.green, italic: true,
  });
}

// SLIDE 34 — Managing Notifications
{
  const s = pres.addSlide();
  contentSlide(s, 'Managing Your Notification Inbox', ['Admin', 'CRM', 'TD', 'CRE']);
  const tips = [
    { icon: '✓', color: C.green, title: 'Auto-mark as Read', desc: 'Notifications are automatically marked as read when you open the dropdown.' },
    { icon: '🕑', color: C.blue, title: 'Nightly Refresh', desc: 'The system runs at 2:00 AM and creates new notifications based on vehicle service status.' },
    { icon: '⟳', color: C.orange, title: 'Sync Immediately', desc: 'Click Sync Follow-ups on the Follow-ups page to refresh right now — don\'t wait until midnight.' },
    { icon: '📞', color: C.red, title: 'Many Notifications?', desc: 'Many unread notifications usually means several customers need to be called today.' },
  ];
  tips.forEach((t, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = col === 0 ? 0.4 : 5.15;
    const y = 1.1 + row * 2.15;
    card(s, x, y, 4.55, 1.95, C.white);
    s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: y + 0.25, w: 0.8, h: 0.8, fill: { color: t.color } });
    s.addText(t.icon, { x: x + 0.2, y: y + 0.25, w: 0.8, h: 0.8, fontSize: 22, align: 'center', valign: 'middle', margin: 0 });
    s.addText(t.title, { x: x + 1.15, y: y + 0.22, w: 3.25, h: 0.42, fontSize: 13, color: C.navy, bold: true, margin: 0 });
    s.addText(t.desc, { x: x + 0.15, y: y + 0.75, w: 4.25, h: 1.1, fontSize: 11, color: C.slate, margin: 0 });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 11 — Import Center
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  sectionDivider(s, 'SECTION 11', 'Import Center', 'Bulk data import — vehicles, customers, records');
}

// SLIDE 35 — Bulk Import
{
  const s = pres.addSlide();
  contentSlide(s, 'Importing Data in Bulk', ['Admin', 'CRM']);
  s.addText('Go to Import Center in the sidebar. Supported types: Vehicles, Customers, Service Records, Job Cards.', {
    x: 0.5, y: 1.05, w: 9, h: 0.45, fontSize: 12, color: C.slate,
  });
  const steps = [
    'Download the CSV template from Import Center',
    'Fill in your data following the column headers exactly',
    'Upload the completed file in Import Center',
    'The system validates first — shows any errors before importing',
    'Review the preview and fix errors in your CSV if needed',
    'Click  Process Import  to commit the data',
  ];
  steps.forEach((st, i) => {
    const y = 1.62 + i * 0.62;
    card(s, 0.5, y, 9.0, 0.53, i % 2 === 0 ? C.white : C.light);
    s.addShape(pres.shapes.OVAL, { x: 0.65, y: y + 0.08, w: 0.35, h: 0.35, fill: { color: i < 3 ? C.navy : C.green } });
    s.addText(String(i + 1), { x: 0.65, y: y + 0.08, w: 0.35, h: 0.35, fontSize: 11, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    s.addText(st, { x: 1.15, y, w: 8.2, h: 0.53, fontSize: 12, color: C.navy, valign: 'middle', margin: 0 });
  });
  card(s, 0.5, 5.35, 9.0, 0.2, 'FFF7ED');
  s.addText('⚠  Duplicates are detected and skipped. For large datasets, split into batches of 1,000 rows.', {
    x: 0.65, y: 5.35, w: 8.7, h: 0.2, fontSize: 9, color: C.orange, valign: 'middle', margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 12 — Summary & Tips
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  sectionDivider(s, 'SECTION 12', 'Daily Routine & Tips', 'Getting the most out of the DMS every day');
}

// SLIDE 36 — Daily Routine by Role
{
  const s = pres.addSlide();
  contentSlide(s, 'Suggested Daily Routine (Morning)', ['Admin', 'CRM', 'TD', 'CRE']);
  const roles = [
    {
      title: 'Admin', color: C.purple,
      tasks: ['Check Dashboard for overview', 'Review new users or requests', 'Check Activity Log'],
    },
    {
      title: 'CRM Officer', color: C.blue,
      tasks: ['Open Follow-ups → review queue', 'Sync Follow-ups to refresh', 'Log calls as they are made', 'Open job cards for arrivals', 'Convert closed to delivery notes'],
    },
    {
      title: 'Technical Director', color: C.orange,
      tasks: ['Check Dashboard for open job cards', 'Review appointments for the week', 'Check service records for issues'],
    },
    {
      title: 'CRE', color: C.green,
      tasks: ['Open Follow-ups → work through queue', 'Log every call outcome', 'Book appointments for customers who agree', 'Check Appointments for today'],
    },
  ];
  roles.forEach((r, i) => {
    const x = 0.35 + i * 2.35;
    card(s, x, 1.05, 2.2, 4.3, C.white);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.12, y: 1.12, w: 1.96, h: 0.42, fill: { color: r.color }, rectRadius: 0.08 });
    s.addText(r.title, { x: x + 0.12, y: 1.12, w: 1.96, h: 0.42, fontSize: 12, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
    r.tasks.forEach((t, j) => {
      s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: 1.68 + j * 0.66, w: 0.28, h: 0.28, fill: { color: r.color } });
      s.addText('✓', { x: x + 0.2, y: 1.68 + j * 0.66, w: 0.28, h: 0.28, fontSize: 9, color: C.white, bold: true, align: 'center', valign: 'middle', margin: 0 });
      s.addText(t, { x: x + 0.56, y: 1.65 + j * 0.66, w: 1.55, h: 0.62, fontSize: 9.5, color: C.navy, valign: 'middle', margin: 0 });
    });
  });
}

// SLIDE 37 — Key Tips & Reminders
{
  const s = pres.addSlide();
  contentSlide(s, 'Tips for Getting the Most Out of the DMS');
  const tips = [
    { icon: '📝', text: 'Always log every call in Follow-ups — even a no-answer. This builds your contact history.' },
    { icon: '🌙', text: 'Retention status updates automatically every night. Check it each morning.' },
    { icon: '⟳', text: 'Use Sync Follow-ups for immediate refresh — don\'t wait for midnight.' },
    { icon: '🔧', text: 'When a vehicle is received, always open a Job Card — this keeps service history accurate.' },
    { icon: '✅', text: 'When work is done, always convert to Delivery Note — this updates the vehicle\'s last service date.' },
    { icon: '🔒', text: 'Never share your login credentials. Each person should have their own account.' },
    { icon: '💻', text: 'Access the system at  app.rwandamotor.com  from any browser, any device.' },
    { icon: '📧', text: 'For any access issues, contact your Admin at  admin@rwandamotor.com' },
  ];
  tips.forEach((t, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = col === 0 ? 0.4 : 5.15;
    const y = 1.05 + row * 1.1;
    card(s, x, y, 4.55, 0.92, i % 3 === 0 ? 'EFF6FF' : i % 3 === 1 ? 'F0FDF4' : C.light);
    s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: y + 0.26, w: 0.4, h: 0.4, fill: { color: C.navy } });
    s.addText(t.icon, { x: x + 0.15, y: y + 0.26, w: 0.4, h: 0.4, fontSize: 14, align: 'center', valign: 'middle', margin: 0 });
    s.addText(t.text, { x: x + 0.67, y, w: 3.75, h: 0.92, fontSize: 10.5, color: C.navy, valign: 'middle', margin: 0 });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  CLOSING SLIDE
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  slide_addGreenStrip(s);
  s.addText('Thank You', { x: 0.9, y: 1.2, w: 8.2, h: 1.2, fontSize: 52, color: C.white, bold: true });
  s.addText('Questions? We\'re here to help.', { x: 0.9, y: 2.55, w: 8, h: 0.55, fontSize: 18, color: C.green });
  s.addText('Support:  admin@rwandamotor.com', { x: 0.9, y: 3.3, w: 8, h: 0.4, fontSize: 14, color: C.muted });
  s.addText('System:  app.rwandamotor.com', { x: 0.9, y: 3.75, w: 8, h: 0.4, fontSize: 14, color: C.muted });
  s.addText('Rwandamotor Ltd  ·  Dealer Management System', { x: 0.9, y: 5.0, w: 8, h: 0.35, fontSize: 10, color: C.slate });
}

// ─────────────────────────────────────────────────────────────────────────────
//  WRITE FILE
// ─────────────────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: 'C:/Users/APC/Claude/Projects/CSSR/Rwandamotor-DMS-User-Guide.pptx' })
  .then(() => console.log('✅  Presentation saved: Rwandamotor-DMS-User-Guide.pptx'))
  .catch(err => { console.error('❌  Error:', err); process.exit(1); });
