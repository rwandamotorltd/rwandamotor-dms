using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RwandaMotor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PartialUniqueVin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // A full unique index on VIN blocks re-importing a vehicle whose record was
            // soft-deleted (IsDeleted=true), because the deleted row still holds the slot.
            // Converting to a partial index (only among non-deleted rows) allows the import
            // to create a fresh record for a previously deleted VIN without 23505 errors.
            migrationBuilder.DropIndex(
                name: "IX_Vehicles_VIN",
                table: "Vehicles");

            migrationBuilder.Sql(
                @"CREATE UNIQUE INDEX ""IX_Vehicles_VIN"" ON ""Vehicles""(""VIN"") WHERE ""IsDeleted"" = false;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Vehicles_VIN",
                table: "Vehicles");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_VIN",
                table: "Vehicles",
                column: "VIN",
                unique: true);
        }
    }
}
