using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RwandaMotor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PartialUniqueIndexSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop full unique index — soft-deleted rows block reuse of their codes,
            // causing 23505 violations when the same brand/model is imported after deletion.
            migrationBuilder.DropIndex(
                name: "IX_Brands_Code",
                table: "Brands");

            // Partial unique index: only enforce uniqueness among non-deleted brands.
            migrationBuilder.Sql(
                @"CREATE UNIQUE INDEX ""IX_Brands_Code"" ON ""Brands""(""Code"") WHERE ""IsDeleted"" = false;");

            // Same fix for VehicleModels composite index.
            migrationBuilder.DropIndex(
                name: "IX_VehicleModels_BrandId_Code",
                table: "VehicleModels");

            migrationBuilder.Sql(
                @"CREATE UNIQUE INDEX ""IX_VehicleModels_BrandId_Code"" ON ""VehicleModels""(""BrandId"", ""Code"") WHERE ""IsDeleted"" = false;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Brands_Code",
                table: "Brands");

            migrationBuilder.CreateIndex(
                name: "IX_Brands_Code",
                table: "Brands",
                column: "Code",
                unique: true);

            migrationBuilder.DropIndex(
                name: "IX_VehicleModels_BrandId_Code",
                table: "VehicleModels");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleModels_BrandId_Code",
                table: "VehicleModels",
                columns: new[] { "BrandId", "Code" },
                unique: true);
        }
    }
}
