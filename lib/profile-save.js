// JSON compare-and-swap belongs in a POST body, never a PostgREST URL filter.
export function saveProfile(admin,profile,data,active=profile.active){
 return admin.rpc('sl_update_profile',{profile_id:profile.id,expected_data:profile.data,replacement_data:data,replacement_active:active});
}
