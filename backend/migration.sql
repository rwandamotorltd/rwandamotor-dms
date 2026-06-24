CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "AspNetRoles" (
        "Id" text NOT NULL,
        "Name" character varying(256),
        "NormalizedName" character varying(256),
        "ConcurrencyStamp" text,
        CONSTRAINT "PK_AspNetRoles" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "AspNetUsers" (
        "Id" text NOT NULL,
        "FullName" text NOT NULL,
        "Role" text,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "LastLoginAt" timestamp with time zone,
        "RefreshToken" text,
        "RefreshTokenExpiry" timestamp with time zone,
        "UserName" character varying(256),
        "NormalizedUserName" character varying(256),
        "Email" character varying(256),
        "NormalizedEmail" character varying(256),
        "EmailConfirmed" boolean NOT NULL,
        "PasswordHash" text,
        "SecurityStamp" text,
        "ConcurrencyStamp" text,
        "PhoneNumber" text,
        "PhoneNumberConfirmed" boolean NOT NULL,
        "TwoFactorEnabled" boolean NOT NULL,
        "LockoutEnd" timestamp with time zone,
        "LockoutEnabled" boolean NOT NULL,
        "AccessFailedCount" integer NOT NULL,
        CONSTRAINT "PK_AspNetUsers" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "Brands" (
        "Id" uuid NOT NULL,
        "Name" character varying(100) NOT NULL,
        "Code" character varying(20) NOT NULL,
        "LogoUrl" text,
        "Country" text,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp with time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_Brands" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "Customers" (
        "Id" uuid NOT NULL,
        "FullName" character varying(200) NOT NULL,
        "Phone" character varying(20),
        "Email" character varying(150),
        "Address" text,
        "City" text,
        "Country" text,
        "PreferredContactMethod" integer NOT NULL,
        "Category" integer NOT NULL,
        "CompanyName" text,
        "TaxId" text,
        "Notes" text,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp with time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_Customers" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "ImportLogs" (
        "Id" uuid NOT NULL,
        "ImportType" integer NOT NULL,
        "Status" integer NOT NULL,
        "FileName" text NOT NULL,
        "OriginalFileName" text,
        "FileSizeBytes" bigint NOT NULL,
        "TotalRows" integer NOT NULL,
        "ValidRows" integer NOT NULL,
        "ImportedRows" integer NOT NULL,
        "ErrorRows" integer NOT NULL,
        "DuplicateRows" integer NOT NULL,
        "ErrorSummary" text,
        "ErrorDetailsJson" text,
        "StartedAt" timestamp with time zone,
        "CompletedAt" timestamp with time zone,
        "IsRolledBack" boolean NOT NULL,
        "RolledBackAt" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp with time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_ImportLogs" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "Technicians" (
        "Id" uuid NOT NULL,
        "FullName" text NOT NULL,
        "EmployeeCode" text NOT NULL,
        "Phone" text,
        "Email" text,
        "Specialization" text,
        "CertificationLevel" text,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp with time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_Technicians" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "WorkshopBays" (
        "Id" uuid NOT NULL,
        "Name" text NOT NULL,
        "Code" text NOT NULL,
        "BayType" text,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp with time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_WorkshopBays" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "AspNetRoleClaims" (
        "Id" integer GENERATED BY DEFAULT AS IDENTITY,
        "RoleId" text NOT NULL,
        "ClaimType" text,
        "ClaimValue" text,
        CONSTRAINT "PK_AspNetRoleClaims" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_AspNetRoleClaims_AspNetRoles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "AspNetUserClaims" (
        "Id" integer GENERATED BY DEFAULT AS IDENTITY,
        "UserId" text NOT NULL,
        "ClaimType" text,
        "ClaimValue" text,
        CONSTRAINT "PK_AspNetUserClaims" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_AspNetUserClaims_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "AspNetUserLogins" (
        "LoginProvider" text NOT NULL,
        "ProviderKey" text NOT NULL,
        "ProviderDisplayName" text,
        "UserId" text NOT NULL,
        CONSTRAINT "PK_AspNetUserLogins" PRIMARY KEY ("LoginProvider", "ProviderKey"),
        CONSTRAINT "FK_AspNetUserLogins_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "AspNetUserRoles" (
        "UserId" text NOT NULL,
        "RoleId" text NOT NULL,
        CONSTRAINT "PK_AspNetUserRoles" PRIMARY KEY ("UserId", "RoleId"),
        CONSTRAINT "FK_AspNetUserRoles_AspNetRoles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_AspNetUserRoles_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "AspNetUserTokens" (
        "UserId" text NOT NULL,
        "LoginProvider" text NOT NULL,
        "Name" text NOT NULL,
        "Value" text,
        CONSTRAINT "PK_AspNetUserTokens" PRIMARY KEY ("UserId", "LoginProvider", "Name"),
        CONSTRAINT "FK_AspNetUserTokens_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "VehicleModels" (
        "Id" uuid NOT NULL,
        "BrandId" uuid NOT NULL,
        "Name" character varying(100) NOT NULL,
        "Code" character varying(20) NOT NULL,
        "Segment" text,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp with time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_VehicleModels" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_VehicleModels_Brands_BrandId" FOREIGN KEY ("BrandId") REFERENCES "Brands" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "ImportLogRows" (
        "Id" uuid NOT NULL,
        "ImportLogId" uuid NOT NULL,
        "RowNumber" integer NOT NULL,
        "IsValid" boolean NOT NULL,
        "IsDuplicate" boolean NOT NULL,
        "IsImported" boolean NOT NULL,
        "RawDataJson" text,
        "ErrorMessage" text,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp with time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_ImportLogRows" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ImportLogRows_ImportLogs_ImportLogId" FOREIGN KEY ("ImportLogId") REFERENCES "ImportLogs" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "ServicePolicies" (
        "Id" uuid NOT NULL,
        "BrandId" uuid,
        "ModelId" uuid,
        "Name" character varying(200) NOT NULL,
        "Description" text,
        "IntervalKm" integer NOT NULL,
        "IntervalMonths" integer NOT NULL,
        "DueSoonLeadDays" integer NOT NULL,
        "DueSoonLeadKm" integer NOT NULL,
        "LostThresholdMonths" integer NOT NULL,
        "IsDefault" boolean NOT NULL,
        "IsActive" boolean NOT NULL,
        "CountryCode" text,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp with time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_ServicePolicies" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ServicePolicies_Brands_BrandId" FOREIGN KEY ("BrandId") REFERENCES "Brands" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_ServicePolicies_VehicleModels_ModelId" FOREIGN KEY ("ModelId") REFERENCES "VehicleModels" ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "Vehicles" (
        "Id" uuid NOT NULL,
        "VIN" character varying(17) NOT NULL,
        "PlateNumber" character varying(20),
        "BrandId" uuid NOT NULL,
        "ModelId" uuid NOT NULL,
        "Year" integer NOT NULL,
        "EngineNumber" text,
        "Color" text,
        "FuelType" text,
        "Transmission" text,
        "EngineCapacityCC" integer,
        "CustomerId" uuid,
        "SaleDate" timestamp with time zone,
        "SalePrice" numeric(18,2),
        "IsSoldByDealership" boolean NOT NULL,
        "CurrentMileage" integer,
        "LastServiceMileage" integer,
        "LastServiceDate" timestamp with time zone,
        "NextServiceMileage" integer,
        "NextServiceDate" timestamp with time zone,
        "WarrantyStartDate" timestamp with time zone,
        "WarrantyEndDate" timestamp with time zone,
        "WarrantyKmLimit" integer,
        "ServicePolicyId" uuid,
        "RetentionStatus" integer NOT NULL,
        "RetentionStatusUpdatedAt" timestamp with time zone,
        "Notes" text,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp with time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_Vehicles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Vehicles_Brands_BrandId" FOREIGN KEY ("BrandId") REFERENCES "Brands" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Vehicles_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_Vehicles_ServicePolicies_ServicePolicyId" FOREIGN KEY ("ServicePolicyId") REFERENCES "ServicePolicies" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_Vehicles_VehicleModels_ModelId" FOREIGN KEY ("ModelId") REFERENCES "VehicleModels" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "FollowUps" (
        "Id" uuid NOT NULL,
        "VehicleId" uuid NOT NULL,
        "CustomerId" uuid NOT NULL,
        "AssignedToUserId" text,
        "Status" integer NOT NULL,
        "Priority" integer NOT NULL,
        "ContactMethod" integer NOT NULL,
        "Reason" text NOT NULL,
        "Notes" text,
        "DueDate" timestamp with time zone NOT NULL,
        "ContactedAt" timestamp with time zone,
        "ResolvedAt" timestamp with time zone,
        "RecoveryAchieved" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp with time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_FollowUps" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_FollowUps_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_FollowUps_Vehicles_VehicleId" FOREIGN KEY ("VehicleId") REFERENCES "Vehicles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "ServiceRecords" (
        "Id" uuid NOT NULL,
        "VehicleId" uuid NOT NULL,
        "TechnicianId" uuid,
        "BayId" uuid,
        "ServiceDate" timestamp with time zone NOT NULL,
        "MileageAtService" integer NOT NULL,
        "ServiceType" integer NOT NULL,
        "ServiceDescription" text,
        "InvoiceNumber" text,
        "LaborCost" numeric(18,2),
        "PartsCost" numeric(18,2),
        "TotalCost" numeric(18,2),
        "NextServiceMileage" integer,
        "NextServiceDate" timestamp with time zone,
        "Notes" text,
        "IsWarrantyJob" boolean NOT NULL,
        "IsRecallJob" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp with time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_ServiceRecords" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ServiceRecords_Technicians_TechnicianId" FOREIGN KEY ("TechnicianId") REFERENCES "Technicians" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_ServiceRecords_Vehicles_VehicleId" FOREIGN KEY ("VehicleId") REFERENCES "Vehicles" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_ServiceRecords_WorkshopBays_BayId" FOREIGN KEY ("BayId") REFERENCES "WorkshopBays" ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE TABLE "ServiceParts" (
        "Id" uuid NOT NULL,
        "ServiceRecordId" uuid NOT NULL,
        "PartNumber" text NOT NULL,
        "PartName" text NOT NULL,
        "Quantity" integer NOT NULL,
        "UnitPrice" numeric(18,2) NOT NULL,
        "TotalPrice" numeric(18,2) NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp with time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_ServiceParts" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ServiceParts_ServiceRecords_ServiceRecordId" FOREIGN KEY ("ServiceRecordId") REFERENCES "ServiceRecords" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_AspNetRoleClaims_RoleId" ON "AspNetRoleClaims" ("RoleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE UNIQUE INDEX "RoleNameIndex" ON "AspNetRoles" ("NormalizedName");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_AspNetUserClaims_UserId" ON "AspNetUserClaims" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_AspNetUserLogins_UserId" ON "AspNetUserLogins" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_AspNetUserRoles_RoleId" ON "AspNetUserRoles" ("RoleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "EmailIndex" ON "AspNetUsers" ("NormalizedEmail");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE UNIQUE INDEX "UserNameIndex" ON "AspNetUsers" ("NormalizedUserName");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Brands_Code" ON "Brands" ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_Customers_Email" ON "Customers" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_Customers_FullName" ON "Customers" ("FullName");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_Customers_Phone" ON "Customers" ("Phone");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_FollowUps_CustomerId" ON "FollowUps" ("CustomerId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_FollowUps_DueDate" ON "FollowUps" ("DueDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_FollowUps_Status" ON "FollowUps" ("Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_FollowUps_VehicleId" ON "FollowUps" ("VehicleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_ImportLogRows_ImportLogId" ON "ImportLogRows" ("ImportLogId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_ServiceParts_ServiceRecordId" ON "ServiceParts" ("ServiceRecordId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_ServicePolicies_BrandId" ON "ServicePolicies" ("BrandId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_ServicePolicies_ModelId" ON "ServicePolicies" ("ModelId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_ServiceRecords_BayId" ON "ServiceRecords" ("BayId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_ServiceRecords_ServiceDate" ON "ServiceRecords" ("ServiceDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_ServiceRecords_TechnicianId" ON "ServiceRecords" ("TechnicianId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_ServiceRecords_VehicleId" ON "ServiceRecords" ("VehicleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_VehicleModels_BrandId_Code" ON "VehicleModels" ("BrandId", "Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_Vehicles_BrandId" ON "Vehicles" ("BrandId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_Vehicles_CustomerId" ON "Vehicles" ("CustomerId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_Vehicles_ModelId" ON "Vehicles" ("ModelId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_Vehicles_NextServiceDate" ON "Vehicles" ("NextServiceDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_Vehicles_PlateNumber" ON "Vehicles" ("PlateNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_Vehicles_RetentionStatus" ON "Vehicles" ("RetentionStatus");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_Vehicles_SaleDate" ON "Vehicles" ("SaleDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE INDEX "IX_Vehicles_ServicePolicyId" ON "Vehicles" ("ServicePolicyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Vehicles_VIN" ON "Vehicles" ("VIN");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260611091822_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260611091822_InitialCreate', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615042839_AddJobCards') THEN
    CREATE TABLE "JobCardSequences" (
        "Id" uuid NOT NULL,
        "Year" integer NOT NULL,
        "CurrentSequence" integer NOT NULL,
        "StartingSequence" integer NOT NULL,
        "CreatedAt" timestamp without time zone NOT NULL,
        "UpdatedAt" timestamp without time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp without time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_JobCardSequences" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615042839_AddJobCards') THEN
    CREATE UNIQUE INDEX "IX_JobCardSequences_Year" ON "JobCardSequences" ("Year");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615042839_AddJobCards') THEN
    CREATE TABLE "JobCards" (
        "Id" uuid NOT NULL,
        "JobCardNumber" text NOT NULL,
        "VehicleId" uuid NOT NULL,
        "CustomerId" uuid,
        "TechnicianId" uuid,
        "VIN" text NOT NULL,
        "PlateNumber" text,
        "Year" integer NOT NULL,
        "Color" text,
        "Transmission" text,
        "FuelType" text,
        "FuelLevel" integer NOT NULL,
        "Mileage" integer NOT NULL,
        "CustomerName" text,
        "CustomerPhone" text,
        "ServiceType" integer NOT NULL,
        "Notes" text,
        "AdditionalInfo" text,
        "AccessoriesPresent" jsonb NOT NULL,
        "Status" integer NOT NULL,
        "ReceivedByUserId" text,
        "ReceivedByName" text NOT NULL,
        "ClosedAt" timestamp without time zone,
        "ClosedByUserId" text,
        "ClosedByName" text,
        "DeliveryNoteNumber" text,
        "DeliveryNoteGeneratedAt" timestamp without time zone,
        "CreatedAt" timestamp without time zone NOT NULL,
        "UpdatedAt" timestamp without time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp without time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_JobCards" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_JobCards_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id"),
        CONSTRAINT "FK_JobCards_Technicians_TechnicianId" FOREIGN KEY ("TechnicianId") REFERENCES "Technicians" ("Id"),
        CONSTRAINT "FK_JobCards_Vehicles_VehicleId" FOREIGN KEY ("VehicleId") REFERENCES "Vehicles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615042839_AddJobCards') THEN
    CREATE INDEX "IX_JobCards_CustomerId" ON "JobCards" ("CustomerId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615042839_AddJobCards') THEN
    CREATE INDEX "IX_JobCards_TechnicianId" ON "JobCards" ("TechnicianId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615042839_AddJobCards') THEN
    CREATE INDEX "IX_JobCards_VehicleId" ON "JobCards" ("VehicleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615042839_AddJobCards') THEN
    CREATE TABLE "SalesHistories" (
        "Id" uuid NOT NULL,
        "VehicleId" uuid NOT NULL,
        "CustomerId" uuid,
        "JobCardId" uuid,
        "SaleDate" timestamp without time zone NOT NULL,
        "SaleType" text NOT NULL,
        "VIN" text NOT NULL,
        "PlateNumber" text,
        "CustomerName" text,
        "JobCardNumber" text,
        "DeliveryNoteNumber" text,
        "Notes" text,
        "CreatedAt" timestamp without time zone NOT NULL,
        "UpdatedAt" timestamp without time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp without time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_SalesHistories" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SalesHistories_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id"),
        CONSTRAINT "FK_SalesHistories_Vehicles_VehicleId" FOREIGN KEY ("VehicleId") REFERENCES "Vehicles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615042839_AddJobCards') THEN
    CREATE INDEX "IX_SalesHistories_CustomerId" ON "SalesHistories" ("CustomerId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615042839_AddJobCards') THEN
    CREATE INDEX "IX_SalesHistories_VehicleId" ON "SalesHistories" ("VehicleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615042839_AddJobCards') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260615042839_AddJobCards', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615083120_AddPermissionGroups') THEN
    ALTER TABLE "AspNetUsers" ADD "PermissionGroupId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615083120_AddPermissionGroups') THEN
    CREATE TABLE "PermissionGroups" (
        "Id" uuid NOT NULL,
        "Name" text NOT NULL,
        "Description" text,
        "Permissions" jsonb NOT NULL,
        "CreatedAt" timestamp without time zone NOT NULL,
        "UpdatedAt" timestamp without time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp without time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_PermissionGroups" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260615083120_AddPermissionGroups') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260615083120_AddPermissionGroups', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260616001000_EnsureCompanySettingsTable') THEN

                    CREATE TABLE IF NOT EXISTS "CompanySettings" (
                        "Id"                      uuid                        NOT NULL,
                        "CompanyName"             text                        NOT NULL DEFAULT 'RwandaMotor',
                        "Address"                 text,
                        "Phone"                   text,
                        "Email"                   text,
                        "TinNumber"               text,
                        "Website"                 text,
                        "JobCardShowHeader"        boolean                     NOT NULL DEFAULT true,
                        "JobCardShowFooter"        boolean                     NOT NULL DEFAULT true,
                        "DeliveryNoteShowHeader"   boolean                     NOT NULL DEFAULT true,
                        "DeliveryNoteShowFooter"   boolean                     NOT NULL DEFAULT true,
                        "FooterDisclaimer"         text,
                        "UpdatedAt"               timestamp with time zone    NOT NULL DEFAULT now(),
                        CONSTRAINT "PK_CompanySettings" PRIMARY KEY ("Id")
                    );
                
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260616001000_EnsureCompanySettingsTable') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260616001000_EnsureCompanySettingsTable', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260616002000_AddUserCustomPermissions') THEN

                    ALTER TABLE "AspNetUsers"
                    ADD COLUMN IF NOT EXISTS "CustomPermissions" jsonb NOT NULL DEFAULT '[]'::jsonb;
                
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260616002000_AddUserCustomPermissions') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260616002000_AddUserCustomPermissions', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260616003000_AllowExternalVehicleImport') THEN

                    ALTER TABLE "Vehicles" ALTER COLUMN "BrandId" DROP NOT NULL;
                    ALTER TABLE "Vehicles" ALTER COLUMN "ModelId" DROP NOT NULL;
                
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260616003000_AllowExternalVehicleImport') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260616003000_AllowExternalVehicleImport', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260616215744_AddAuditLog') THEN

                    CREATE TABLE IF NOT EXISTS "AuditLogs" (
                        "Id"          bigserial   NOT NULL,
                        "UserId"      text        NOT NULL DEFAULT '',
                        "UserEmail"   text        NOT NULL DEFAULT '',
                        "UserName"    text        NOT NULL DEFAULT '',
                        "Action"      text        NOT NULL DEFAULT '',
                        "EntityType"  text        NOT NULL DEFAULT '',
                        "EntityId"    text,
                        "EntityLabel" text,
                        "OccurredAt"  timestamp without time zone NOT NULL,
                        CONSTRAINT "PK_AuditLogs" PRIMARY KEY ("Id")
                    );
                    CREATE INDEX IF NOT EXISTS "IX_AuditLogs_OccurredAt" ON "AuditLogs" ("OccurredAt" DESC);
                    CREATE INDEX IF NOT EXISTS "IX_AuditLogs_UserId"     ON "AuditLogs" ("UserId");
                    CREATE INDEX IF NOT EXISTS "IX_AuditLogs_EntityType"  ON "AuditLogs" ("EntityType");

                    -- Ensure prior raw-SQL migrations are idempotent for EF model tracking
                    ALTER TABLE "Vehicles"      ALTER COLUMN "BrandId" DROP NOT NULL;
                    ALTER TABLE "Vehicles"      ALTER COLUMN "ModelId" DROP NOT NULL;
                    ALTER TABLE "AspNetUsers"   ADD COLUMN IF NOT EXISTS "CustomPermissions" jsonb NOT NULL DEFAULT '[]'::jsonb;
                
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260616215744_AddAuditLog') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260616215744_AddAuditLog', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260617001000_AddEmailTemplates') THEN

                    ALTER TABLE "CompanySettings"
                        ADD COLUMN IF NOT EXISTS "EmailJobCardMessage"      text NULL,
                        ADD COLUMN IF NOT EXISTS "EmailDeliveryNoteMessage" text NULL;
                
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260617001000_AddEmailTemplates') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260617001000_AddEmailTemplates', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260617002000_AddEmailTemplatesEnsure') THEN

                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name   = 'CompanySettings'
                              AND column_name  = 'EmailJobCardMessage'
                        ) THEN
                            ALTER TABLE "CompanySettings" ADD COLUMN "EmailJobCardMessage" text;
                        END IF;

                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name   = 'CompanySettings'
                              AND column_name  = 'EmailDeliveryNoteMessage'
                        ) THEN
                            ALTER TABLE "CompanySettings" ADD COLUMN "EmailDeliveryNoteMessage" text;
                        END IF;
                    END $$;
                
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260617002000_AddEmailTemplatesEnsure') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260617002000_AddEmailTemplatesEnsure', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260618102615_AddFollowUpInteractionAppointmentNotification') THEN
    CREATE TABLE "Appointments" (
        "Id" uuid NOT NULL,
        "VehicleId" uuid NOT NULL,
        "CustomerId" uuid NOT NULL,
        "FollowUpId" uuid,
        "TechnicianId" uuid,
        "AppointmentDate" timestamp without time zone NOT NULL,
        "DurationMinutes" integer NOT NULL,
        "ServiceType" integer NOT NULL,
        "Status" integer NOT NULL,
        "Notes" text,
        "ConfirmedAt" timestamp without time zone,
        "ConfirmedBy" text,
        "CompletedAt" timestamp without time zone,
        "CompletedJobCardId" uuid,
        "CreatedAt" timestamp without time zone NOT NULL,
        "UpdatedAt" timestamp without time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp without time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_Appointments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Appointments_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Appointments_FollowUps_FollowUpId" FOREIGN KEY ("FollowUpId") REFERENCES "FollowUps" ("Id"),
        CONSTRAINT "FK_Appointments_Technicians_TechnicianId" FOREIGN KEY ("TechnicianId") REFERENCES "Technicians" ("Id"),
        CONSTRAINT "FK_Appointments_Vehicles_VehicleId" FOREIGN KEY ("VehicleId") REFERENCES "Vehicles" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260618102615_AddFollowUpInteractionAppointmentNotification') THEN
    CREATE TABLE "FollowUpInteractions" (
        "Id" uuid NOT NULL,
        "FollowUpId" uuid NOT NULL,
        "Outcome" integer NOT NULL,
        "Notes" text,
        "NextContactDate" timestamp without time zone,
        "EmailType" text,
        "CreatedAt" timestamp without time zone NOT NULL,
        "UpdatedAt" timestamp without time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp without time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_FollowUpInteractions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_FollowUpInteractions_FollowUps_FollowUpId" FOREIGN KEY ("FollowUpId") REFERENCES "FollowUps" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260618102615_AddFollowUpInteractionAppointmentNotification') THEN
    CREATE TABLE "Notifications" (
        "Id" uuid NOT NULL,
        "Title" text NOT NULL,
        "Message" text NOT NULL,
        "Type" integer NOT NULL,
        "TargetUserId" text,
        "VehicleId" uuid,
        "CustomerId" uuid,
        "FollowUpId" uuid,
        "AppointmentId" uuid,
        "IsRead" boolean NOT NULL,
        "ReadAt" timestamp without time zone,
        "Link" text,
        "CreatedAt" timestamp without time zone NOT NULL,
        "UpdatedAt" timestamp without time zone,
        "CreatedBy" text,
        "UpdatedBy" text,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp without time zone,
        "DeletedBy" text,
        CONSTRAINT "PK_Notifications" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Notifications_Appointments_AppointmentId" FOREIGN KEY ("AppointmentId") REFERENCES "Appointments" ("Id"),
        CONSTRAINT "FK_Notifications_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id"),
        CONSTRAINT "FK_Notifications_FollowUps_FollowUpId" FOREIGN KEY ("FollowUpId") REFERENCES "FollowUps" ("Id"),
        CONSTRAINT "FK_Notifications_Vehicles_VehicleId" FOREIGN KEY ("VehicleId") REFERENCES "Vehicles" ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260618102615_AddFollowUpInteractionAppointmentNotification') THEN
    CREATE INDEX "IX_Appointments_CustomerId" ON "Appointments" ("CustomerId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260618102615_AddFollowUpInteractionAppointmentNotification') THEN
    CREATE INDEX "IX_Appointments_FollowUpId" ON "Appointments" ("FollowUpId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260618102615_AddFollowUpInteractionAppointmentNotification') THEN
    CREATE INDEX "IX_Appointments_TechnicianId" ON "Appointments" ("TechnicianId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260618102615_AddFollowUpInteractionAppointmentNotification') THEN
    CREATE INDEX "IX_Appointments_VehicleId" ON "Appointments" ("VehicleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260618102615_AddFollowUpInteractionAppointmentNotification') THEN
    CREATE INDEX "IX_FollowUpInteractions_FollowUpId" ON "FollowUpInteractions" ("FollowUpId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260618102615_AddFollowUpInteractionAppointmentNotification') THEN
    CREATE INDEX "IX_Notifications_AppointmentId" ON "Notifications" ("AppointmentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260618102615_AddFollowUpInteractionAppointmentNotification') THEN
    CREATE INDEX "IX_Notifications_CustomerId" ON "Notifications" ("CustomerId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260618102615_AddFollowUpInteractionAppointmentNotification') THEN
    CREATE INDEX "IX_Notifications_FollowUpId" ON "Notifications" ("FollowUpId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260618102615_AddFollowUpInteractionAppointmentNotification') THEN
    CREATE INDEX "IX_Notifications_VehicleId" ON "Notifications" ("VehicleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260618102615_AddFollowUpInteractionAppointmentNotification') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260618102615_AddFollowUpInteractionAppointmentNotification', '9.0.1');
    END IF;
END $EF$;
COMMIT;

