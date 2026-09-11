// ---------------------------------------------------------------------------
// Shared filter DTO for all analytics endpoints.
//
// All fields are OPTIONAL and arrive as raw query strings. The types mirror
// exactly the fields read by AnalyticsService (`analytics.service.ts`):
//   f.from, f.to, f.granularity, f.clientId, f.truckId, f.driverId,
//   f.trailerId, f.orderStatus, f.tripStatus, f.origin, f.destination,
//   f.country, f.limit[, f.sortBy, f.sortDir].
//
// Validation is intentionally permissive: values that are missing, 'all' or
// 'undefined' are treated as "no filter" inside the service (see numParam).
// ---------------------------------------------------------------------------

import {
  IsOptional, IsString, IsIn, IsISO8601, Matches,
} from 'class-validator';

export type GranularityParam = 'day' | 'week' | 'month';

export class AnalyticsFilters {
  /** ISO date (YYYY-MM-DD) range start. Defaults handled by parseRange. */
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  /** ISO date (YYYY-MM-DD) range end (inclusive end-of-day). */
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  granularity?: GranularityParam;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  truckId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  trailerId?: string;

  /** Orders terminal/active status value (see OrderRow.status). */
  @IsOptional()
  @IsString()
  orderStatus?: string;

  /** Trips status value (see TripRow.status). */
  @IsOptional()
  @IsString()
  tripStatus?: string;

  /** Free-text match on origin city/country. */
  @IsOptional()
  @IsString()
  origin?: string;

  /** Free-text match on destination city/country. */
  @IsOptional()
  @IsString()
  destination?: string;

  /** Free-text match on either origin or destination country. */
  @IsOptional()
  @IsString()
  country?: string;

  /** Row cap for list-type analytics (tables, exceptions). */
  @IsOptional()
  @Matches(/^\d{1,5}$/, { message: 'limit must be a positive integer' })
  limit?: string;

  /** Optional client-side table sorting column. */
  @IsOptional()
  @IsString()
  sortBy?: string;

  /** Optional client-side table sorting direction. */
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}