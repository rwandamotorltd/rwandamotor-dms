using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RwandaMotor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AllowExternalVehicleImport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""Vehicles"" ALTER COLUMN ""BrandId"" DROP NOT NULL;
                ALTER TABLE ""Vehicles"" ALTER COLUMN ""ModelId"" DROP NOT NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Set any NULLs to a safe placeholder before re-adding the NOT NULL constraint
            migrationBuilder.Sql(@"
                UPDATE ""Vehicles"" SET ""BrandId"" = (SELECT ""Id"" FROM ""Brands"" LIMIT 1)
                    WHERE ""BrandId"" IS NULL;
                UPDATE ""Vehicles"" SET ""ModelId"" = (SELECT ""Id"" FROM ""VehicleModels"" LIMIT 1)
                    WHERE ""ModelId"" IS NULL;
                ALTER TABLE ""Vehicles"" ALTER COLUMN ""BrandId"" SET NOT NULL;
                ALTER TABLE ""Vehicles"" ALTER COLUMN ""ModelId"" SET NOT NULL;
            ");
        }
    }
}
