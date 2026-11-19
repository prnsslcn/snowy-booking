
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_actions": {
                  Row: {
                    "action": string,"admin_email": string | null,"booking_id": string | null,"created_at": string,"detail": NonNullable<Json>,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"admin_email"?: string | null,"booking_id"?: string | null,"created_at"?: string,"detail"?: NonNullable<Json>,"id"?: never
                  }
                  Update: {
                    "action"?: string,"admin_email"?: string | null,"booking_id"?: string | null,"created_at"?: string,"detail"?: NonNullable<Json>,"id"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_actions_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"admins": {
                  Row: {
                    "created_at": string,"email": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"bookings": {
                  Row: {
                    "amount": number,"cancel_error": Json | null,"checked_in_at": string | null,"checked_out_at": string | null,"created_at": string,"date": string,"expires_at": string | null,"guest_count": number | null,"guest_name": string,"guest_phone": string | null,"id": string,"lookup_code": string | null,"manual_refund_note": string | null,"note": string | null,"offline_payment_method": string | null,"order_id": string,"price_snapshot": NonNullable<Json>,"refund_amount": number | null,"refund_method": string | null,"refunded_at": string | null,"source": string,"status": string,"type": string,"unit_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"cancel_error"?: Json | null,"checked_in_at"?: string | null,"checked_out_at"?: string | null,"created_at"?: string,"date": string,"expires_at"?: string | null,"guest_count"?: number | null,"guest_name": string,"guest_phone"?: string | null,"id"?: string,"lookup_code"?: string | null,"manual_refund_note"?: string | null,"note"?: string | null,"offline_payment_method"?: string | null,"order_id": string,"price_snapshot": NonNullable<Json>,"refund_amount"?: number | null,"refund_method"?: string | null,"refunded_at"?: string | null,"source": string,"status": string,"type": string,"unit_id": string,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"cancel_error"?: Json | null,"checked_in_at"?: string | null,"checked_out_at"?: string | null,"created_at"?: string,"date"?: string,"expires_at"?: string | null,"guest_count"?: number | null,"guest_name"?: string,"guest_phone"?: string | null,"id"?: string,"lookup_code"?: string | null,"manual_refund_note"?: string | null,"note"?: string | null,"offline_payment_method"?: string | null,"order_id"?: string,"price_snapshot"?: NonNullable<Json>,"refund_amount"?: number | null,"refund_method"?: string | null,"refunded_at"?: string | null,"source"?: string,"status"?: string,"type"?: string,"unit_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_type_fkey"
      columns: ["type"]
isOneToOne: false
      referencedRelation: "product_types"
      referencedColumns: ["type"]
    },{
      foreignKeyName: "bookings_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"closed_dates": {
                  Row: {
                    "created_at": string,"date": string,"note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date": string,"note"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"date"?: string,"note"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"holidays": {
                  Row: {
                    "created_at": string,"date": string,"name": string,"source": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date": string,"name": string,"source"?: string
                  }
                  Update: {
                    "created_at"?: string,"date"?: string,"name"?: string,"source"?: string
                  }
                  Relationships: [
                    
                  ]
                },"locked_dates": {
                  Row: {
                    "created_at": string,"date": string,"note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date": string,"note"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"date"?: string,"note"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"lookup_attempts": {
                  Row: {
                    "attempted_at": string,"id": number,"ip": unknown,"phone": string | null,"success": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "attempted_at"?: string,"id"?: never,"ip"?: unknown,"phone"?: string | null,"success": boolean
                  }
                  Update: {
                    "attempted_at"?: string,"id"?: never,"ip"?: unknown,"phone"?: string | null,"success"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "booking_id": string | null,"channel": string,"created_at": string,"id": string,"payload": Json | null,"recipient": string,"sent_at": string | null,"status": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id"?: string | null,"channel"?: string,"created_at"?: string,"id"?: string,"payload"?: Json | null,"recipient": string,"sent_at"?: string | null,"status"?: string,"type": string
                  }
                  Update: {
                    "booking_id"?: string | null,"channel"?: string,"created_at"?: string,"id"?: string,"payload"?: Json | null,"recipient"?: string,"sent_at"?: string | null,"status"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"approved_at": string | null,"booking_id": string,"cancelled_at": string | null,"created_at": string,"id": string,"method": string | null,"raw_response": Json | null,"status": string,"toss_order_id": string,"toss_payment_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"approved_at"?: string | null,"booking_id": string,"cancelled_at"?: string | null,"created_at"?: string,"id"?: string,"method"?: string | null,"raw_response"?: Json | null,"status": string,"toss_order_id": string,"toss_payment_key": string
                  }
                  Update: {
                    "amount"?: number,"approved_at"?: string | null,"booking_id"?: string,"cancelled_at"?: string | null,"created_at"?: string,"id"?: string,"method"?: string | null,"raw_response"?: Json | null,"status"?: string,"toss_order_id"?: string,"toss_payment_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"peak_periods": {
                  Row: {
                    "created_at": string,"from_date": string,"id": string,"name": string,"to_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_date": string,"id"?: string,"name": string,"to_date": string
                  }
                  Update: {
                    "created_at"?: string,"from_date"?: string,"id"?: string,"name"?: string,"to_date"?: string
                  }
                  Relationships: [
                    
                  ]
                },"product_types": {
                  Row: {
                    "is_active": boolean,"max_capacity": number,"name": string,"price_weekday": number,"price_weekend": number,"slug": string,"sort": number,"type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "is_active"?: boolean,"max_capacity": number,"name": string,"price_weekday": number,"price_weekend": number,"slug": string,"sort"?: number,"type": string,"updated_at"?: string
                  }
                  Update: {
                    "is_active"?: boolean,"max_capacity"?: number,"name"?: string,"price_weekday"?: number,"price_weekend"?: number,"slug"?: string,"sort"?: number,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"site_settings": {
                  Row: {
                    "business_closed": boolean,"closed_message": string | null,"closed_title": string | null,"id": boolean,"notice_popup": NonNullable<Json>,"season_from": string | null,"season_to": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_closed"?: boolean,"closed_message"?: string | null,"closed_title"?: string | null,"id"?: boolean,"notice_popup"?: NonNullable<Json>,"season_from"?: string | null,"season_to"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "business_closed"?: boolean,"closed_message"?: string | null,"closed_title"?: string | null,"id"?: boolean,"notice_popup"?: NonNullable<Json>,"season_from"?: string | null,"season_to"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"unit_blackouts": {
                  Row: {
                    "created_at": string,"from_date": string,"id": string,"reason": string | null,"to_date": string,"unit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_date": string,"id"?: string,"reason"?: string | null,"to_date": string,"unit_id": string
                  }
                  Update: {
                    "created_at"?: string,"from_date"?: string,"id"?: string,"reason"?: string | null,"to_date"?: string,"unit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "unit_blackouts_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"units": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"label": string,"sort": number,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"label": string,"sort": number,"type": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"label"?: string,"sort"?: number,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "units_type_fkey"
      columns: ["type"]
isOneToOne: false
      referencedRelation: "product_types"
      referencedColumns: ["type"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_add_unit":
{ Args: { "p_label": string,"p_type": string }; Returns: string
                           },
"admin_cancel_offline_booking":
{ Args: { "p_booking_id": string }; Returns: undefined
                           },
"admin_check_in":
{ Args: { "p_booking_id": string }; Returns: undefined
                           },
"admin_check_out":
{ Args: { "p_booking_id": string }; Returns: undefined
                           },
"admin_create_blackout":
{ Args: { "p_from": string,"p_reason": string,"p_to": string,"p_unit_id": string }; Returns: string
                           },
"admin_create_booking":
{ Args: { "p_amount"?: number,"p_date": string,"p_guest_count": number,"p_guest_name": string,"p_guest_phone": string,"p_note"?: string,"p_payment_method"?: string,"p_source": string,"p_type": string }; Returns: {
              "amount": number,"booking_id": string,"order_id": string,"unit_label": string
            }[]
                           },
"admin_delete_blackout":
{ Args: { "p_blackout_id": string }; Returns: undefined
                           },
"admin_manual_refund_tx":
{ Args: { "p_amount": number,"p_booking_id": string,"p_note": string }; Returns: undefined
                           },
"admin_reassign_unit":
{ Args: { "p_booking_id": string,"p_new_unit_id": string }; Returns: {
              "from_label": string,"to_label": string
            }[]
                           },
"admin_set_unit_active":
{ Args: { "p_active": boolean,"p_unit_id": string }; Returns: undefined
                           },
"admin_swap_units":
{ Args: { "p_booking_a": string,"p_booking_b": string }; Returns: undefined
                           },
"admin_undo_check":
{ Args: { "p_booking_id": string }; Returns: string
                           },
"admin_update_offline_booking":
{ Args: { "p_base_amount"?: number,"p_booking_id": string,"p_extras"?: Json,"p_guest_count"?: number,"p_guest_name"?: string,"p_guest_phone"?: string,"p_note"?: string,"p_payment_method"?: string }; Returns: {
              "amount": number
            }[]
                           },
"availability":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "date": string,"day_status": string,"rate_kind": string,"remaining": number,"total_units": number,"type": string,"unit_price": number
            }[]
                           },
"blackout_conflicts":
{ Args: { "p_from": string,"p_to": string,"p_unit_id": string }; Returns: {
              "booking_id": string,"date": string,"free_units": Json,"guest_name": string,"guest_phone": string,"source": string,"status": string
            }[]
                           },
"confirm_booking_tx":
{ Args: { "p_amount": number,"p_approved_at": string,"p_method": string,"p_order_id": string,"p_payment_key": string,"p_raw": Json }; Returns: {
              "booking_id": string,"lookup_code": string,"outcome": string
            }[]
                           },
"expire_pending_bookings":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"expire_stale_pending":
{ Args: { "p_date": string,"p_type": string }; Returns: number
                           },
"finalize_refund_tx":
{ Args: { "p_booking_id": string,"p_is_partial": boolean,"p_raw": Json,"p_refund_amount": number,"p_refund_method": string }; Returns: {
              "booking_id": string,"outcome": string,"refunded_amount": number
            }[]
                           },
"is_active_status":
{ Args: { "p_status": string }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_weekend_rate":
{ Args: { "p_date": string }; Returns: boolean
                           },
"kst_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"lock_phone_date":
{ Args: { "p_date": string,"p_phone": string }; Returns: undefined
                           },
"lock_type_date":
{ Args: { "p_date": string,"p_type": string }; Returns: undefined
                           },
"pending_payment_timeout":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"pick_free_unit":
{ Args: { "p_date": string,"p_type": string }; Returns: string
                           },
"price_for":
{ Args: { "p_date": string,"p_type": string }; Returns: {
              "rate_kind": string,"unit_price": number
            }[]
                           },
"record_cancel_error":
{ Args: { "p_booking_id": string,"p_code": string,"p_message": string }; Returns: undefined
                           },
"release_pending_booking":
{ Args: { "p_order_id": string }; Returns: boolean
                           },
"request_cancel_tx":
{ Args: { "p_admin_override"?: boolean,"p_order_id": string }; Returns: {
              "booking_id": string,"outcome": string,"paid_amount": number,"payment_key": string,"usage_date": string
            }[]
                           },
"reserve_booking":
{ Args: { "p_date": string,"p_guest_count": number,"p_guest_name": string,"p_guest_phone": string,"p_type": string }; Returns: {
              "amount": number,"booking_id": string,"expires_at": string,"lookup_code": string,"order_id": string,"order_name": string
            }[]
                           },
"unit_blacked_out":
{ Args: { "p_date": string,"p_unit_id": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
