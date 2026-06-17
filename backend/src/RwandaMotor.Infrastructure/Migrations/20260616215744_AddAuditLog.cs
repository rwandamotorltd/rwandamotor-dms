using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RwandaMotor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // AuditLogs table — idempotent so it is safe to apply on a DB that was
            // partially updated via raw-SQL migrations.
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""AuditLogs"" (
                    ""Id""          bigserial   NOT NULL,
                    ""UserId""      text        NOT NULL DEFAULT '',
                    ""UserEmail""   text        NOT NULL DEFAULT '',
                    ""UserName""    text        NOT NULL DEFAULT '',
                    ""Action""      text        NOT NULL DEFAULT '',
                    ""EntityType""  text        NOT NULL DEFAULT '',
                    ""EntityId""    text,
                    ""EntityLabel"" text,
                    ""OccurredAt""  timestamp without time zone NOT NULL,
                    CONSTRAINT ""PK_AuditLogs"" PRIMARY KEY (""Id"")
                );
                CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_OccurredAt"" ON ""AuditLogs"" (""OccurredAt"" DESC);
                CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_UserId""     ON ""AuditLogs"" (""UserId"");
                CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_EntityType""  ON ""AuditLogs"" (""EntityType"");

                -- Ensure prior raw-SQL migrations are idempotent for EF model tracking
                ALTER TABLE ""Vehicles""      ALTER COLUMN ""BrandId"" DROP NOT NULL;
                ALTER TABLE ""Vehicles""      ALTER COLUMN ""ModelId"" DROP NOT NULL;
                ALTER TABLE ""AspNetUsers""   ADD COLUMN IF NOT EXISTS ""CustomPermissions"" jsonb NOT NULL DEFAULT '[]'::jsonb;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""AuditLogs"";");
        }
    }
}
