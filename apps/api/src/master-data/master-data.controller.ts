import { Controller, Get, Post, Patch, Delete, Query, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MasterDataService } from './services/master-data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { listQuerySchema } from './dto/common.dto';
import type { ListQueryDto } from './dto/common.dto';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  createCountrySchema,
  updateCountrySchema,
  createRegionSchema,
  updateRegionSchema,
  createTimezoneSchema,
  updateTimezoneSchema,
  createCurrencySchema,
  updateCurrencySchema,
  createUomSchema,
  updateUomSchema,
  createTransportModeSchema,
  updateTransportModeSchema,
  createServiceTypeSchema,
  updateServiceTypeSchema,
  createCargoTypeSchema,
  updateCargoTypeSchema,
  createVehicleTypeSchema,
  updateVehicleTypeSchema,
  createTrailerTypeSchema,
  updateTrailerTypeSchema,
  createStatusDefinitionSchema,
  updateStatusDefinitionSchema,
  createDocumentTypeSchema,
  updateDocumentTypeSchema,
  createNumberingConfigSchema,
  updateNumberingConfigSchema,
  createLocationSchema,
  updateLocationSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createBranchSchema,
  updateBranchSchema,
} from './dto';
import type {
  CreateCountryDto,
  UpdateCountryDto,
  CreateRegionDto,
  UpdateRegionDto,
  CreateTimezoneDto,
  UpdateTimezoneDto,
  CreateCurrencyDto,
  UpdateCurrencyDto,
  CreateUomDto,
  UpdateUomDto,
  CreateTransportModeDto,
  UpdateTransportModeDto,
  CreateServiceTypeDto,
  UpdateServiceTypeDto,
  CreateCargoTypeDto,
  UpdateCargoTypeDto,
  CreateVehicleTypeDto,
  UpdateVehicleTypeDto,
  CreateTrailerTypeDto,
  UpdateTrailerTypeDto,
  CreateStatusDefinitionDto,
  UpdateStatusDefinitionDto,
  CreateDocumentTypeDto,
  UpdateDocumentTypeDto,
  CreateNumberingConfigDto,
  UpdateNumberingConfigDto,
  CreateLocationDto,
  UpdateLocationDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreateBranchDto,
  UpdateBranchDto,
} from './dto';

@ApiTags('master-data')
@Controller('master-data')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MasterDataController {
  constructor(private readonly service: MasterDataService) {}

  @Get('countries')
  @ApiOperation({ summary: 'List countries' })
  async listCountries(@Query() query: ListQueryDto) {
    const ctx = listQuerySchema.parse(query);
    return this.service.listCountries(ctx);
  }

  @Get('countries/:id')
  @ApiOperation({ summary: 'Get country' })
  async getCountry(@Param('id') id: string) {
    return this.service.getCountry(id);
  }

  @Post('countries')
  @ApiOperation({ summary: 'Create country' })
  async createCountry(@Body(new ZodValidationPipe(createCountrySchema)) body: CreateCountryDto) {
    return this.service.createCountry(body);
  }

  @Patch('countries/:id')
  @ApiOperation({ summary: 'Update country' })
  async updateCountry(@Param('id') id: string, @Body(new ZodValidationPipe(updateCountrySchema)) body: UpdateCountryDto) {
    return this.service.updateCountry(id, body);
  }

  @Delete('countries/:id')
  @ApiOperation({ summary: 'Delete country' })
  async deleteCountry(@Param('id') id: string) {
    return this.service.deleteCountry(id);
  }

  @Get('currencies')
  @ApiOperation({ summary: 'List currencies' })
  async listCurrencies(@Query() query: ListQueryDto) {
    const ctx = listQuerySchema.parse(query);
    return this.service.listCurrencies(ctx);
  }

  @Get('currencies/:id')
  @ApiOperation({ summary: 'Get currency' })
  async getCurrency(@Param('id') id: string) {
    return this.service.getCurrency(id);
  }

  @Post('currencies')
  @ApiOperation({ summary: 'Create currency' })
  async createCurrency(@Body(new ZodValidationPipe(createCurrencySchema)) body: CreateCurrencyDto) {
    return this.service.createCurrency(body);
  }

  @Patch('currencies/:id')
  @ApiOperation({ summary: 'Update currency' })
  async updateCurrency(@Param('id') id: string, @Body(new ZodValidationPipe(updateCurrencySchema)) body: UpdateCurrencyDto) {
    return this.service.updateCurrency(id, body);
  }

  @Delete('currencies/:id')
  @ApiOperation({ summary: 'Delete currency' })
  async deleteCurrency(@Param('id') id: string) {
    return this.service.deleteCurrency(id);
  }

  @Get('uoms')
  @ApiOperation({ summary: 'List units of measure' })
  async listUoms(@Query() query: ListQueryDto & { category?: string }) {
    const ctx = listQuerySchema.parse(query);
    return this.service.listUoms(ctx);
  }

  @Get('uoms/:id')
  @ApiOperation({ summary: 'Get UOM' })
  async getUom(@Param('id') id: string) {
    return this.service.getUom(id);
  }

  @Post('uoms')
  @ApiOperation({ summary: 'Create UOM' })
  async createUom(@Body(new ZodValidationPipe(createUomSchema)) body: CreateUomDto) {
    return this.service.createUom(body);
  }

  @Patch('uoms/:id')
  @ApiOperation({ summary: 'Update UOM' })
  async updateUom(@Param('id') id: string, @Body(new ZodValidationPipe(updateUomSchema)) body: UpdateUomDto) {
    return this.service.updateUom(id, body);
  }

  @Delete('uoms/:id')
  @ApiOperation({ summary: 'Delete UOM' })
  async deleteUom(@Param('id') id: string) {
    return this.service.deleteUom(id);
  }

  @Get('transport-modes')
  @ApiOperation({ summary: 'List transport modes' })
  async listTransportModes(@Query() query: ListQueryDto) {
    const ctx = listQuerySchema.parse(query);
    return this.service.listTransportModes(ctx);
  }

  @Get('transport-modes/:id')
  @ApiOperation({ summary: 'Get transport mode' })
  async getTransportMode(@Param('id') id: string) {
    return this.service.getTransportMode(id);
  }

  @Post('transport-modes')
  @ApiOperation({ summary: 'Create transport mode' })
  async createTransportMode(@Body(new ZodValidationPipe(createTransportModeSchema)) body: CreateTransportModeDto) {
    return this.service.createTransportMode(body);
  }

  @Patch('transport-modes/:id')
  @ApiOperation({ summary: 'Update transport mode' })
  async updateTransportMode(@Param('id') id: string, @Body(new ZodValidationPipe(updateTransportModeSchema)) body: UpdateTransportModeDto) {
    return this.service.updateTransportMode(id, body);
  }

  @Delete('transport-modes/:id')
  @ApiOperation({ summary: 'Delete transport mode' })
  async deleteTransportMode(@Param('id') id: string) {
    return this.service.deleteTransportMode(id);
  }

  @Get('regions')
  @ApiOperation({ summary: 'List regions' })
  async listRegions(@Query() query: ListQueryDto) {
    const ctx = listQuerySchema.parse(query);
    return this.service.listRegions(ctx);
  }

  @Get('regions/:id')
  @ApiOperation({ summary: 'Get region' })
  async getRegion(@Param('id') id: string) {
    return this.service.getRegion(id);
  }

  @Post('regions')
  @ApiOperation({ summary: 'Create region' })
  async createRegion(@Body(new ZodValidationPipe(createRegionSchema)) body: CreateRegionDto) {
    return this.service.createRegion(body);
  }

  @Patch('regions/:id')
  @ApiOperation({ summary: 'Update region' })
  async updateRegion(@Param('id') id: string, @Body(new ZodValidationPipe(updateRegionSchema)) body: UpdateRegionDto) {
    return this.service.updateRegion(id, body);
  }

  @Delete('regions/:id')
  @ApiOperation({ summary: 'Delete region' })
  async deleteRegion(@Param('id') id: string) {
    return this.service.deleteRegion(id);
  }

  @Get('timezones')
  @ApiOperation({ summary: 'List timezones' })
  async listTimezones(@Query() query: ListQueryDto) {
    const ctx = listQuerySchema.parse(query);
    return this.service.listTimezones(ctx);
  }

  @Get('timezones/:id')
  @ApiOperation({ summary: 'Get timezone' })
  async getTimezone(@Param('id') id: string) {
    return this.service.getTimezone(id);
  }

  @Post('timezones')
  @ApiOperation({ summary: 'Create timezone' })
  async createTimezone(@Body(new ZodValidationPipe(createTimezoneSchema)) body: CreateTimezoneDto) {
    return this.service.createTimezone(body);
  }

  @Patch('timezones/:id')
  @ApiOperation({ summary: 'Update timezone' })
  async updateTimezone(@Param('id') id: string, @Body(new ZodValidationPipe(updateTimezoneSchema)) body: UpdateTimezoneDto) {
    return this.service.updateTimezone(id, body);
  }

  @Delete('timezones/:id')
  @ApiOperation({ summary: 'Delete timezone' })
  async deleteTimezone(@Param('id') id: string) {
    return this.service.deleteTimezone(id);
  }

  @Get('service-types')
  @ApiOperation({ summary: 'List service types' })
  async listServiceTypes(@CurrentUser() user: any, @Query() query: ListQueryDto) {
    const ctx = listQuerySchema.parse(query);
    const context = await this.service.getUserContext(user.id);
    return this.service.listServiceTypes(context, ctx);
  }

  @Get('service-types/:id')
  @ApiOperation({ summary: 'Get service type' })
  async getServiceType(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.getServiceType(context, id);
  }

  @Post('service-types')
  @ApiOperation({ summary: 'Create service type' })
  async createServiceType(@CurrentUser() user: any, @Body(new ZodValidationPipe(createServiceTypeSchema)) body: CreateServiceTypeDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.createServiceType(context, body);
  }

  @Patch('service-types/:id')
  @ApiOperation({ summary: 'Update service type' })
  async updateServiceType(@CurrentUser() user: any, @Param('id') id: string, @Body(new ZodValidationPipe(updateServiceTypeSchema)) body: UpdateServiceTypeDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.updateServiceType(context, id, body);
  }

  @Delete('service-types/:id')
  @ApiOperation({ summary: 'Delete service type' })
  async deleteServiceType(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.deleteServiceType(context, id);
  }

  @Get('cargo-types')
  @ApiOperation({ summary: 'List cargo types' })
  async listCargoTypes(@CurrentUser() user: any, @Query() query: ListQueryDto) {
    const ctx = listQuerySchema.parse(query);
    const context = await this.service.getUserContext(user.id);
    return this.service.listCargoTypes(context, ctx);
  }

  @Get('cargo-types/:id')
  @ApiOperation({ summary: 'Get cargo type' })
  async getCargoType(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.getCargoType(context, id);
  }

  @Post('cargo-types')
  @ApiOperation({ summary: 'Create cargo type' })
  async createCargoType(@CurrentUser() user: any, @Body(new ZodValidationPipe(createCargoTypeSchema)) body: CreateCargoTypeDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.createCargoType(context, body);
  }

  @Patch('cargo-types/:id')
  @ApiOperation({ summary: 'Update cargo type' })
  async updateCargoType(@CurrentUser() user: any, @Param('id') id: string, @Body(new ZodValidationPipe(updateCargoTypeSchema)) body: UpdateCargoTypeDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.updateCargoType(context, id, body);
  }

  @Delete('cargo-types/:id')
  @ApiOperation({ summary: 'Delete cargo type' })
  async deleteCargoType(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.deleteCargoType(context, id);
  }

  @Get('vehicle-types')
  @ApiOperation({ summary: 'List vehicle types' })
  async listVehicleTypes(@CurrentUser() user: any, @Query() query: ListQueryDto) {
    const ctx = listQuerySchema.parse(query);
    const context = await this.service.getUserContext(user.id);
    return this.service.listVehicleTypes(context, ctx);
  }

  @Get('vehicle-types/:id')
  @ApiOperation({ summary: 'Get vehicle type' })
  async getVehicleType(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.getVehicleType(context, id);
  }

  @Post('vehicle-types')
  @ApiOperation({ summary: 'Create vehicle type' })
  async createVehicleType(@CurrentUser() user: any, @Body(new ZodValidationPipe(createVehicleTypeSchema)) body: CreateVehicleTypeDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.createVehicleType(context, body);
  }

  @Patch('vehicle-types/:id')
  @ApiOperation({ summary: 'Update vehicle type' })
  async updateVehicleType(@CurrentUser() user: any, @Param('id') id: string, @Body(new ZodValidationPipe(updateVehicleTypeSchema)) body: UpdateVehicleTypeDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.updateVehicleType(context, id, body);
  }

  @Delete('vehicle-types/:id')
  @ApiOperation({ summary: 'Delete vehicle type' })
  async deleteVehicleType(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.deleteVehicleType(context, id);
  }

  @Get('trailer-types')
  @ApiOperation({ summary: 'List trailer types' })
  async listTrailerTypes(@CurrentUser() user: any, @Query() query: ListQueryDto) {
    const ctx = listQuerySchema.parse(query);
    const context = await this.service.getUserContext(user.id);
    return this.service.listTrailerTypes(context, ctx);
  }

  @Get('trailer-types/:id')
  @ApiOperation({ summary: 'Get trailer type' })
  async getTrailerType(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.getTrailerType(context, id);
  }

  @Post('trailer-types')
  @ApiOperation({ summary: 'Create trailer type' })
  async createTrailerType(@CurrentUser() user: any, @Body(new ZodValidationPipe(createTrailerTypeSchema)) body: CreateTrailerTypeDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.createTrailerType(context, body);
  }

  @Patch('trailer-types/:id')
  @ApiOperation({ summary: 'Update trailer type' })
  async updateTrailerType(@CurrentUser() user: any, @Param('id') id: string, @Body(new ZodValidationPipe(updateTrailerTypeSchema)) body: UpdateTrailerTypeDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.updateTrailerType(context, id, body);
  }

  @Delete('trailer-types/:id')
  @ApiOperation({ summary: 'Delete trailer type' })
  async deleteTrailerType(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.deleteTrailerType(context, id);
  }

  @Get('status-definitions')
  @ApiOperation({ summary: 'List status definitions' })
  async listStatusDefinitions(@CurrentUser() user: any, @Query() query: ListQueryDto & { entityType?: string }) {
    const ctx = listQuerySchema.parse(query);
    const context = await this.service.getUserContext(user.id);
    return this.service.listStatusDefinitions(context, ctx);
  }

  @Get('status-definitions/:id')
  @ApiOperation({ summary: 'Get status definition' })
  async getStatusDefinition(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.getStatusDefinition(context, id);
  }

  @Post('status-definitions')
  @ApiOperation({ summary: 'Create status definition' })
  async createStatusDefinition(@CurrentUser() user: any, @Body(new ZodValidationPipe(createStatusDefinitionSchema)) body: CreateStatusDefinitionDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.createStatusDefinition(context, body);
  }

  @Patch('status-definitions/:id')
  @ApiOperation({ summary: 'Update status definition' })
  async updateStatusDefinition(@CurrentUser() user: any, @Param('id') id: string, @Body(new ZodValidationPipe(updateStatusDefinitionSchema)) body: UpdateStatusDefinitionDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.updateStatusDefinition(context, id, body);
  }

  @Delete('status-definitions/:id')
  @ApiOperation({ summary: 'Delete status definition' })
  async deleteStatusDefinition(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.deleteStatusDefinition(context, id);
  }

  @Get('document-types')
  @ApiOperation({ summary: 'List document types' })
  async listDocumentTypes(@CurrentUser() user: any, @Query() query: ListQueryDto) {
    const ctx = listQuerySchema.parse(query);
    const context = await this.service.getUserContext(user.id);
    return this.service.listDocumentTypes(context, ctx);
  }

  @Get('document-types/:id')
  @ApiOperation({ summary: 'Get document type' })
  async getDocumentType(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.getDocumentType(context, id);
  }

  @Post('document-types')
  @ApiOperation({ summary: 'Create document type' })
  async createDocumentType(@CurrentUser() user: any, @Body(new ZodValidationPipe(createDocumentTypeSchema)) body: CreateDocumentTypeDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.createDocumentType(context, body);
  }

  @Patch('document-types/:id')
  @ApiOperation({ summary: 'Update document type' })
  async updateDocumentType(@CurrentUser() user: any, @Param('id') id: string, @Body(new ZodValidationPipe(updateDocumentTypeSchema)) body: UpdateDocumentTypeDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.updateDocumentType(context, id, body);
  }

  @Delete('document-types/:id')
  @ApiOperation({ summary: 'Delete document type' })
  async deleteDocumentType(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.deleteDocumentType(context, id);
  }

  @Get('numbering-configs')
  @ApiOperation({ summary: 'List numbering configurations' })
  async listNumberingConfigs(@CurrentUser() user: any, @Query() query: ListQueryDto & { entityType?: string }) {
    const ctx = listQuerySchema.parse(query);
    const context = await this.service.getUserContext(user.id);
    return this.service.listNumberingConfigs(context, ctx);
  }

  @Get('numbering-configs/:id')
  @ApiOperation({ summary: 'Get numbering configuration' })
  async getNumberingConfig(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.getNumberingConfig(context, id);
  }

  @Post('numbering-configs')
  @ApiOperation({ summary: 'Create numbering configuration' })
  async createNumberingConfig(@CurrentUser() user: any, @Body(new ZodValidationPipe(createNumberingConfigSchema)) body: CreateNumberingConfigDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.createNumberingConfig(context, body);
  }

  @Patch('numbering-configs/:id')
  @ApiOperation({ summary: 'Update numbering configuration' })
  async updateNumberingConfig(@CurrentUser() user: any, @Param('id') id: string, @Body(new ZodValidationPipe(updateNumberingConfigSchema)) body: UpdateNumberingConfigDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.updateNumberingConfig(context, id, body);
  }

  @Delete('numbering-configs/:id')
  @ApiOperation({ summary: 'Delete numbering configuration' })
  async deleteNumberingConfig(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.deleteNumberingConfig(context, id);
  }

  @Get('locations')
  @ApiOperation({ summary: 'List locations' })
  async listLocations(@CurrentUser() user: any, @Query() query: ListQueryDto & { type?: string }) {
    const ctx = listQuerySchema.parse(query);
    const context = await this.service.getUserContext(user.id);
    return this.service.listLocations(context, ctx);
  }

  @Get('locations/:id')
  @ApiOperation({ summary: 'Get location' })
  async getLocation(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.getLocation(context, id);
  }

  @Post('locations')
  @ApiOperation({ summary: 'Create location' })
  async createLocation(@CurrentUser() user: any, @Body(new ZodValidationPipe(createLocationSchema)) body: CreateLocationDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.createLocation(context, body);
  }

  @Patch('locations/:id')
  @ApiOperation({ summary: 'Update location' })
  async updateLocation(@CurrentUser() user: any, @Param('id') id: string, @Body(new ZodValidationPipe(updateLocationSchema)) body: UpdateLocationDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.updateLocation(context, id, body);
  }

  @Delete('locations/:id')
  @ApiOperation({ summary: 'Delete location' })
  async deleteLocation(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.deleteLocation(context, id);
  }

  @Get('departments')
  @ApiOperation({ summary: 'List departments' })
  async listDepartments(@CurrentUser() user: any, @Query() query: ListQueryDto) {
    const ctx = listQuerySchema.parse(query);
    const context = await this.service.getUserContext(user.id);
    return this.service.listDepartments(context, ctx);
  }

  @Get('departments/:id')
  @ApiOperation({ summary: 'Get department' })
  async getDepartment(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.getDepartment(context, id);
  }

  @Post('departments')
  @ApiOperation({ summary: 'Create department' })
  async createDepartment(@CurrentUser() user: any, @Body(new ZodValidationPipe(createDepartmentSchema)) body: CreateDepartmentDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.createDepartment(context, body);
  }

  @Patch('departments/:id')
  @ApiOperation({ summary: 'Update department' })
  async updateDepartment(@CurrentUser() user: any, @Param('id') id: string, @Body(new ZodValidationPipe(updateDepartmentSchema)) body: UpdateDepartmentDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.updateDepartment(context, id, body);
  }

  @Delete('departments/:id')
  @ApiOperation({ summary: 'Delete department' })
  async deleteDepartment(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.deleteDepartment(context, id);
  }

  @Get('branches')
  @ApiOperation({ summary: 'List branches' })
  async listBranches(@CurrentUser() user: any, @Query() query: ListQueryDto) {
    const ctx = listQuerySchema.parse(query);
    const context = await this.service.getUserContext(user.id);
    return this.service.listBranches(context, ctx);
  }

  @Get('branches/:id')
  @ApiOperation({ summary: 'Get branch' })
  async getBranch(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.getBranch(context, id);
  }

  @Post('branches')
  @ApiOperation({ summary: 'Create branch' })
  async createBranch(@CurrentUser() user: any, @Body(new ZodValidationPipe(createBranchSchema)) body: CreateBranchDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.createBranch(context, body);
  }

  @Patch('branches/:id')
  @ApiOperation({ summary: 'Update branch' })
  async updateBranch(@CurrentUser() user: any, @Param('id') id: string, @Body(new ZodValidationPipe(updateBranchSchema)) body: UpdateBranchDto) {
    const context = await this.service.getUserContext(user.id);
    return this.service.updateBranch(context, id, body);
  }

  @Delete('branches/:id')
  @ApiOperation({ summary: 'Delete branch' })
  async deleteBranch(@CurrentUser() user: any, @Param('id') id: string) {
    const context = await this.service.getUserContext(user.id);
    return this.service.deleteBranch(context, id);
  }
}
