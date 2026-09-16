import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('setup SQL is repeatable, private by default, and permits only one Super Admin',async()=>{
 const db=new PGlite();
 try{
 await db.exec("create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key,email text); create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);");
 const setup=await fs.readFile(new URL('../supabase/setup.sql',import.meta.url),'utf8');await db.exec(setup);await db.exec(setup);
 const tables=await db.query("select relname,relrowsecurity from pg_class where relname in ('sl_profiles','sl_workspaces','sl_files')");assert.equal(tables.rows.length,3);assert.ok(tables.rows.every(r=>r.relrowsecurity));
 for(const role of ['anon','authenticated'])for(const table of ['sl_profiles','sl_workspaces','sl_files']){const q=await db.query("select has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') as allowed",[role,table]);assert.equal(q.rows[0].allowed,false);}
 await db.exec("insert into auth.users values('00000000-0000-0000-0000-000000000001','owner@example.test'),('00000000-0000-0000-0000-000000000002','other@example.test');");
 let boot=await fs.readFile(new URL('../supabase/create-superadmin.sql',import.meta.url),'utf8');
 await assert.rejects(db.exec(boot),/Replace/);
 boot=boot.replace(":= 'REPLACE_WITH_YOUR_EMAIL'",":= 'owner@example.test'");
 await db.exec(boot);await db.exec(boot);
 await assert.rejects(db.exec(boot.replace(":= 'owner@example.test'",":= 'other@example.test'")),/already exists/);
 await assert.rejects(db.exec("insert into sl_profiles(id,role,email) values('00000000-0000-0000-0000-000000000002','admin','other@example.test')"),/unique/);
 assert.equal((await db.query("select count(*)::int as n from sl_profiles where role='admin'")).rows[0].n,1);
 assert.equal((await db.query("select public from storage.buckets where id='science-lab-private'")).rows[0].public,false);
 }finally{await db.close();}
});
