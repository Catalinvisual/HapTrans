
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TripCostService } from "./trip-cost.service";

@Controller("trips")
@UseGuards(JwtAuthGuard)
export class TripCostController {
  constructor(private costService: TripCostService) {}

  @Get(":id/costs")
  async findByTrip(@Param("id") id: string) {
    return this.costService.findByTrip(id);
  }

  @Post(":id/costs")
  async create(@Param("id") id: string, @Body() dto: any) {
    return this.costService.create(id, dto);
  }

  @Patch("costs/:costId")
  async update(@Param("costId") costId: string, @Body() dto: any) {
    return this.costService.update(costId, dto);
  }

  @Delete("costs/:costId")
  async remove(@Param("costId") costId: string) {
    return this.costService.remove(costId);
  }
}
