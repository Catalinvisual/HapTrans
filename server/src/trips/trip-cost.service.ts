
import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TripCost } from "./trip-cost.entity";

@Injectable()
export class TripCostService {
  constructor(
    @InjectRepository(TripCost) private costRepo: Repository<TripCost>
  ) {}

  async findByTrip(tripId: string) {
    return this.costRepo.find({ where: { trip: { id: tripId } }, order: { createdAt: "DESC" } });
  }

  async create(tripId: string, dto: { type: string; amount: number; description?: string; driverId?: string; truckId?: string; category?: string }) {
    const cost = this.costRepo.create({
      trip: { id: tripId },
      type: dto.type,
      amount: Number(dto.amount),
      description: dto.description,
      driverId: dto.driverId,
      truckId: dto.truckId,
      category: dto.category || "extra"
    });
    return this.costRepo.save(cost);
  }

  async update(costId: string, dto: Partial<{ type: string; amount: number; description: string; driverId: string; truckId: string; category: string }>) {
    const cost = await this.costRepo.findOne({ where: { id: costId } });
    if (!cost) throw new Error("Cost nu a fost găsit");
    Object.assign(cost, dto);
    return this.costRepo.save(cost);
  }

  async remove(costId: string) {
    const cost = await this.costRepo.findOne({ where: { id: costId } });
    if (!cost) throw new Error("Cost nu a fost găsit");
    await this.costRepo.remove(cost);
    return { success: true };
  }
}
