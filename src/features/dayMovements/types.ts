import type { FieldArrayWithId } from "react-hook-form";
import type { DaDataAddressSuggestion } from "./addressUtils.ts";
import type { DayMovementsFormValues, MovementValues } from "./schema.ts";

export interface SelectOption {
  value: string;
  label: string;
}

export interface TimelineStartPoint {
  departurePlace?: string;
  departureAddress?: DaDataAddressSuggestion | null;
}

export interface AddressConfig {
  getAddressItems: (query: string) => Promise<DaDataAddressSuggestion[]>;
  delay: number;
  minChars: number;
}

export interface MovementsStepTimeline {
  movementsDateMax: string;
  isMovementsDateSet: boolean;
  fields: FieldArrayWithId<DayMovementsFormValues, "movements", "id">[];
  movements: MovementValues[] | undefined;
  chainedMovements: MovementValues[];
  timelineStartPoint: TimelineStartPoint;
  isFirstDepartureReady: boolean;
  canAddMovement: boolean;
  startDeparturePlace: string | undefined;
  homeAddress: DaDataAddressSuggestion | null | undefined;
}

export interface MovementsStepActions {
  onAddMovement: () => void;
  onRemoveMovement: (index: number) => void;
  onBack: () => void;
  getPlaceLabel: (placeCode: string | undefined) => string;
  isMovementLegReady: (movement: MovementValues | undefined) => boolean;
}

export interface MovementsStepStatus {
  movementsError: string | undefined;
  submitError: string | null;
  isSubmitting: boolean;
}
