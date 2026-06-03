import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";

const HEX = /^#[0-9a-fA-F]{6}$/;

function checkPassword(senha: string) {
  const expected = process.env.MASTER_SECTOR_PASSWORD;
  if (!expected) throw new Error("Senha mestra não configurada no servidor.");
  const a = Buffer.from(senha);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Senha mestra incorreta.");
  }
}

function slugify(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Verifica a senha mestra (usado para destravar a UI). */
export const verificarSenhaMestra = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string }) => z.object({ senha: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    checkPassword(data.senha);
    return { ok: true };
  });

/** Lista todos os setores receptores (inclusive inativos) — exige senha mestra. */
export const listarSetoresReceptoresAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string }) => z.object({ senha: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    checkPassword(data.senha);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("setores_receptores" as any)
      .select("*")
      .order("nome");
    if (error) throw new Error(error.message);
    return { setores: rows ?? [] };
  });

/** Cria um novo setor receptor: tabela + SLA padrão + usuário Admin. */
export const criarSetorReceptor = createServerFn({ method: "POST" })
  .inputValidator((d: {
    senha: string;
    nome: string;
    cor_hex: string;
    cor_fg_hex: string;
  }) =>
    z.object({
      senha: z.string().min(1).max(200),
      nome: z.string().trim().min(2).max(60),
      cor_hex: z.string().regex(HEX, "Cor inválida"),
      cor_fg_hex: z.string().regex(HEX, "Cor do texto inválida"),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    checkPassword(data.senha);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Gera slug único
    const base = slugify(data.nome);
    if (!base) throw new Error("Nome inválido para gerar identificador.");
    let slug = base;
    for (let i = 2; i < 100; i++) {
      const { data: ex } = await supabaseAdmin
        .from("setores_receptores" as any)
        .select("slug")
        .eq("slug", slug)
        .maybeSingle();
      if (!ex) break;
      slug = `${base}-${i}`;
    }

    // Insere setor
    const { error: insErr } = await supabaseAdmin.from("setores_receptores" as any).insert({
      slug,
      nome: data.nome.trim(),
      cor_hex: data.cor_hex,
      cor_fg_hex: data.cor_fg_hex,
    });
    if (insErr) throw new Error(insErr.message);

    // SLA padrão
    const { error: slaErr } = await supabaseAdmin
      .from("sla_config" as any)
      .insert({ setor: slug, horas_resposta: 4, horas_resolucao: 24 });
    if (slaErr && !slaErr.message.includes("duplicate")) {
      throw new Error(slaErr.message);
    }

    // Cria usuário Admin padrão
    const adminEmail = `admin@${slug}.local`;
    const adminPassword = "Admin@123";
    const { data: created, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "Administrador", setor: slug },
    });
    if (userErr) throw new Error(`Setor criado, mas falhou ao criar admin: ${userErr.message}`);

    if (created.user) {
      const { error: pErr } = await supabaseAdmin.from("perfis").insert({
        id: created.user.id,
        full_name: "Administrador",
        email: adminEmail,
        setor: slug,
        role: "admin",
        ativo: true,
      });
      if (pErr) throw new Error(`Setor criado, mas falhou ao criar perfil admin: ${pErr.message}`);
    }

    return {
      slug,
      adminEmail,
      adminPassword,
    };
  });

/** Ativa/desativa um setor receptor. */
export const alternarSetorReceptor = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string; slug: string; ativo: boolean }) =>
    z.object({
      senha: z.string().min(1).max(200),
      slug: z.string().min(1).max(40),
      ativo: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    checkPassword(data.senha);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("setores_receptores" as any)
      .update({ ativo: data.ativo })
      .eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lista admins de um setor. */
export const listarAdminsSetor = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string; slug: string }) =>
    z.object({
      senha: z.string().min(1).max(200),
      slug: z.string().min(1).max(40),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    checkPassword(data.senha);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("perfis")
      .select("id, full_name, email, ativo")
      .eq("setor", data.slug)
      .eq("role", "admin")
      .order("full_name");
    if (error) throw new Error(error.message);
    return { admins: rows ?? [] };
  });

/** Cria um novo admin para um setor. */
export const criarAdminSetor = createServerFn({ method: "POST" })
  .inputValidator((d: {
    senha: string;
    slug: string;
    email: string;
    password: string;
    full_name: string;
  }) =>
    z.object({
      senha: z.string().min(1).max(200),
      slug: z.string().min(1).max(40),
      email: z.string().trim().email().max(255),
      password: z.string().min(8).max(200),
      full_name: z.string().trim().min(2).max(120),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    checkPassword(data.senha);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verifica setor
    const { data: setor, error: sErr } = await supabaseAdmin
      .from("setores_receptores" as any)
      .select("slug")
      .eq("slug", data.slug)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!setor) throw new Error("Setor não encontrado.");

    const { data: created, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, setor: data.slug },
    });
    if (userErr) throw new Error(userErr.message);
    if (!created.user) throw new Error("Falha ao criar usuário.");

    const { error: pErr } = await supabaseAdmin.from("perfis").insert({
      id: created.user.id,
      full_name: data.full_name,
      email: data.email,
      setor: data.slug,
      role: "admin",
      ativo: true,
    });
    if (pErr) {
      // rollback do auth para não deixar usuário órfão
      await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
      throw new Error(pErr.message);
    }

    return { id: created.user.id, email: data.email };
  });

/** Redefine a senha de um admin. */
export const redefinirSenhaAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { senha: string; userId: string; novaSenha: string }) =>
    z.object({
      senha: z.string().min(1).max(200),
      userId: z.string().uuid(),
      novaSenha: z.string().min(6).max(200),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    checkPassword(data.senha);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Só permite alterar senha de quem é admin
    const { data: perfil, error: pErr } = await supabaseAdmin
      .from("perfis")
      .select("id, role")
      .eq("id", data.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!perfil) throw new Error("Perfil não encontrado.");
    if (perfil.role !== "admin") {
      throw new Error("Esta operação só é permitida para contas admin.");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.novaSenha,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
