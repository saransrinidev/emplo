import { api } from "./client";

export interface Address {
  id: string;
  address_type: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

export interface EmergencyContact {
  id: string;
  contact_name: string;
  relationship_to: string | null;
  contact_number: string | null;
}

export interface Profile {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  mobile_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  date_of_joining: string | null;
  department: string | null;
  designation: string | null;
  manager_name: string | null;
  employment_status: string | null;
  work_location: string | null;
  profile_photo: string | null;
  addresses: Address[];
  emergency_contacts: EmergencyContact[];
}

export interface EditableSections {
  phone: boolean;
  address: boolean;
  certifications: boolean;
}

export const profileApi = {
  get: () => api.get<Profile>("/profile"),
  editableSections: () => api.get<EditableSections>("/profile/editable-sections"),
  updatePhone: (mobile_number: string) =>
    api.put<Profile>("/profile/phone", { mobile_number }),
  updateAddress: (data: {
    address_type: string;
    address_line?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  }) => api.put<Profile>("/profile/address", data),
  updatePhoto: (profile_photo: string) =>
    api.put<Profile>("/profile/photo", { profile_photo }),
  removePhoto: () => api.delete<Profile>("/profile/photo"),
};
