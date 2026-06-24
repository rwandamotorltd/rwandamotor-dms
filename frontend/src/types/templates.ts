export type FieldType = "field" | "label" | "line" | "table";
export type TextAlign = "left" | "center" | "right";
export type FontWeight = "normal" | "bold";

export interface TemplateField {
  id: string;
  fieldKey: string;       // dot-path key OR "$label" / "$line" / "$table"
  label: string;          // shown in palette and as static text for $label
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  fontWeight: FontWeight;
  fontStyle: "normal" | "italic";
  textAlign: TextAlign;
  color: string;
  type: FieldType;
  borderBottom?: boolean; // for line type
}

export interface DocumentTemplate {
  id?: string;
  documentType: string;
  name: string;
  pageWidth: number;
  pageHeight: number;
  fieldsJson: string;
  isDefault: boolean;
  updatedAt?: string;
}

// ── Field registry (available fields per document type) ──────────────────────

export interface FieldDef {
  key: string;
  label: string;
  group: string;
  defaultW?: number;
  defaultH?: number;
  type?: FieldType;
}

export const JOB_CARD_FIELDS: FieldDef[] = [
  // Job Card info
  { key: "jobCard.number",        label: "Job Card Number",   group: "Job Card",  defaultW: 200, defaultH: 28 },
  { key: "jobCard.date",          label: "Date Created",      group: "Job Card",  defaultW: 160, defaultH: 24 },
  { key: "jobCard.completedDate", label: "Completed Date",    group: "Job Card",  defaultW: 160, defaultH: 24 },
  { key: "jobCard.status",        label: "Status",            group: "Job Card",  defaultW: 120, defaultH: 24 },
  { key: "jobCard.serviceType",   label: "Service Type",      group: "Job Card",  defaultW: 160, defaultH: 24 },
  { key: "jobCard.description",   label: "Description / Work Done", group: "Job Card", defaultW: 400, defaultH: 60 },
  { key: "jobCard.laborCost",     label: "Labour Cost",       group: "Job Card",  defaultW: 140, defaultH: 24 },
  { key: "jobCard.partsCost",     label: "Parts Cost",        group: "Job Card",  defaultW: 140, defaultH: 24 },
  { key: "jobCard.discount",      label: "Discount",          group: "Job Card",  defaultW: 140, defaultH: 24 },
  { key: "jobCard.vatAmount",     label: "VAT",               group: "Job Card",  defaultW: 140, defaultH: 24 },
  { key: "jobCard.totalCost",     label: "Total Amount",      group: "Job Card",  defaultW: 160, defaultH: 28 },
  // Vehicle
  { key: "vehicle.plateNumber",   label: "Plate Number",      group: "Vehicle",   defaultW: 160, defaultH: 28 },
  { key: "vehicle.vin",           label: "VIN / Chassis",     group: "Vehicle",   defaultW: 220, defaultH: 24 },
  { key: "vehicle.brand",         label: "Brand",             group: "Vehicle",   defaultW: 140, defaultH: 24 },
  { key: "vehicle.model",         label: "Model",             group: "Vehicle",   defaultW: 140, defaultH: 24 },
  { key: "vehicle.year",          label: "Year",              group: "Vehicle",   defaultW: 80,  defaultH: 24 },
  { key: "vehicle.color",         label: "Color",             group: "Vehicle",   defaultW: 120, defaultH: 24 },
  { key: "vehicle.mileage",       label: "Mileage",           group: "Vehicle",   defaultW: 140, defaultH: 24 },
  { key: "vehicle.fuelLevel",     label: "Fuel Level",        group: "Vehicle",   defaultW: 120, defaultH: 24 },
  // Customer
  { key: "customer.name",         label: "Customer Name",     group: "Customer",  defaultW: 220, defaultH: 24 },
  { key: "customer.phone",        label: "Customer Phone",    group: "Customer",  defaultW: 160, defaultH: 24 },
  { key: "customer.email",        label: "Customer Email",    group: "Customer",  defaultW: 220, defaultH: 24 },
  { key: "customer.address",      label: "Customer Address",  group: "Customer",  defaultW: 280, defaultH: 40 },
  // Technician
  { key: "technician.name",       label: "Technician Name",   group: "Service",   defaultW: 180, defaultH: 24 },
  // Company
  { key: "company.name",          label: "Company Name",      group: "Company",   defaultW: 240, defaultH: 28 },
  { key: "company.address",       label: "Company Address",   group: "Company",   defaultW: 280, defaultH: 40 },
  { key: "company.phone",         label: "Company Phone",     group: "Company",   defaultW: 180, defaultH: 24 },
  { key: "company.email",         label: "Company Email",     group: "Company",   defaultW: 220, defaultH: 24 },
  { key: "company.tin",           label: "TIN Number",        group: "Company",   defaultW: 180, defaultH: 24 },
  { key: "company.website",       label: "Website",           group: "Company",   defaultW: 200, defaultH: 24 },
  // Line items
  { key: "$table",                label: "Line Items Table",  group: "Elements",  defaultW: 700, defaultH: 180, type: "table" },
  // Static elements
  { key: "$label",                label: "Static Text",       group: "Elements",  defaultW: 200, defaultH: 24, type: "label" },
  { key: "$line",                 label: "Horizontal Line",   group: "Elements",  defaultW: 700, defaultH: 8,  type: "line" },
];

export const DELIVERY_NOTE_FIELDS: FieldDef[] = [
  { key: "deliveryNote.number",   label: "Delivery Note No.", group: "Document",  defaultW: 200, defaultH: 28 },
  { key: "deliveryNote.date",     label: "Date",              group: "Document",  defaultW: 160, defaultH: 24 },
  { key: "vehicle.plateNumber",   label: "Plate Number",      group: "Vehicle",   defaultW: 160, defaultH: 28 },
  { key: "vehicle.brand",         label: "Brand",             group: "Vehicle",   defaultW: 140, defaultH: 24 },
  { key: "vehicle.model",         label: "Model",             group: "Vehicle",   defaultW: 140, defaultH: 24 },
  { key: "vehicle.year",          label: "Year",              group: "Vehicle",   defaultW: 80,  defaultH: 24 },
  { key: "vehicle.mileage",       label: "Mileage Out",       group: "Vehicle",   defaultW: 140, defaultH: 24 },
  { key: "customer.name",         label: "Customer Name",     group: "Customer",  defaultW: 220, defaultH: 24 },
  { key: "customer.phone",        label: "Customer Phone",    group: "Customer",  defaultW: 160, defaultH: 24 },
  { key: "technician.name",       label: "Prepared By",       group: "Service",   defaultW: 180, defaultH: 24 },
  { key: "jobCard.description",   label: "Work Performed",    group: "Service",   defaultW: 500, defaultH: 80 },
  { key: "company.name",          label: "Company Name",      group: "Company",   defaultW: 240, defaultH: 28 },
  { key: "company.phone",         label: "Company Phone",     group: "Company",   defaultW: 180, defaultH: 24 },
  { key: "$label",                label: "Static Text",       group: "Elements",  defaultW: 200, defaultH: 24, type: "label" },
  { key: "$line",                 label: "Horizontal Line",   group: "Elements",  defaultW: 700, defaultH: 8,  type: "line"  },
];

export const FIELD_REGISTRY: Record<string, FieldDef[]> = {
  jobCard:      JOB_CARD_FIELDS,
  deliveryNote: DELIVERY_NOTE_FIELDS,
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  jobCard:      "Job Card",
  deliveryNote: "Delivery Note",
};
