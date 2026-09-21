import {AppError} from './domain.js';
export function checked(result){
 const error=result.error;
 if(!error)return result.data;
 if(['42P01','PGRST205'].includes(error.code))throw new AppError(503,'Database setup is required. Contact your administrator.');
 if(['PGRST202','42883'].includes(error.code))throw new AppError(503,'Profile saving needs the database update. Ask the Super Admin to run profile-save-fix.sql.');
 if(error.code==='23505')throw new AppError(409,'This record already exists. Refresh and check the details.');
 if(error.code==='42501')throw new AppError(403,'The database denied this action. Contact your administrator.');
 throw new AppError(502,'The database could not save or load this record. Please retry or contact your administrator.');
}
