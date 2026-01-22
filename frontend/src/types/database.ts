export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          organization_id?: string | null;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          full_name?: string | null;
          created_at?: string;
        };
      };
      connectors: {
        Row: {
          id: string;
          organization_id: string;
          type: string;
          name: string;
          config: Json;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          type: string;
          name: string;
          config?: Json;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          type?: string;
          name?: string;
          config?: Json;
          status?: string;
          created_at?: string;
        };
      };
      workflows: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          definition: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          definition: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          definition?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      executions: {
        Row: {
          id: string;
          workflow_id: string;
          status: string;
          trigger_data: Json | null;
          result: Json | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          workflow_id: string;
          status: string;
          trigger_data?: Json | null;
          result?: Json | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          workflow_id?: string;
          status?: string;
          trigger_data?: Json | null;
          result?: Json | null;
          started_at?: string;
          completed_at?: string | null;
        };
      };
      cad_files: {
        Row: {
          id: string;
          organization_id: string;
          connector_id: string | null;
          filename: string;
          file_path: string;
          file_type: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          connector_id?: string | null;
          filename: string;
          file_path: string;
          file_type: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          connector_id?: string | null;
          filename?: string;
          file_path?: string;
          file_type?: string;
          metadata?: Json | null;
          created_at?: string;
        };
      };
    };
  };
}

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Connector = Database["public"]["Tables"]["connectors"]["Row"];
export type Workflow = Database["public"]["Tables"]["workflows"]["Row"];
export type Execution = Database["public"]["Tables"]["executions"]["Row"];
export type CadFile = Database["public"]["Tables"]["cad_files"]["Row"];
