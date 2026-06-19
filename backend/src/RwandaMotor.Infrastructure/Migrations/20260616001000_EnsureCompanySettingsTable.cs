using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RwandaMotor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnsureCompanySettingsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent — safe whether or not 20260615120000_AddCompanySettings ran.
            // That migration had no Designer file so EF never discovered or applied it.
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""CompanySettings"" (
                    ""Id""                      uuid                        NOT NULL,
                    ""CompanyName""             text                        NOT NULL DEFAULT 'RwandaMotor',
                    ""Address""                 text,
                    ""Phone""                   text,
                    ""Email""                   text,
                    ""TinNumber""               text,
                    ""Website""                 text,
                    ""JobCardShowHeader""        boolean                     NOT NULL DEFAULT true,
                    ""JobCardShowFooter""        boolean                     NOT NULL DEFAULT true,
                    ""DeliveryNoteShowHeader""   boolean                     NOT NULL DEFAULT true,
                    ""DeliveryNoteShowFooter""   boolean                     NOT NULL DEFAULT true,
                    ""FooterDisclaimer""         text,
                    ""UpdatedAt""               timestamp with time zone    NOT NULL DEFAULT now(),
                    CONSTRAINT ""PK_CompanySettings"" PRIMARY KEY (""Id"")
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally empty — we cannot know whether this migration or the
            // original AddCompanySettings created the table, so we leave it alone.
        }
    }
}
