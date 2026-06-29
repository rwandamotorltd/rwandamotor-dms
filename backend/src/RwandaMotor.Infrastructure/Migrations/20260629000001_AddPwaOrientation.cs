using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RwandaMotor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPwaOrientation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PwaOrientation",
                table: "CompanySettings",
                type: "text",
                nullable: false,
                defaultValue: "portrait");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PwaOrientation",
                table: "CompanySettings");
        }
    }
}
