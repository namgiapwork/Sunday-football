"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/current-user";
import { getGroup } from "@/lib/data/groups";
import { getConfirmedPlayersForGeneration, getSession } from "@/lib/data/sessions";
import { getTeams } from "@/lib/data/teams";
import { assertTransition } from "@/lib/sessions/state";
import { generateBalancedTeams } from "@/lib/teams/generate-balanced-teams";
import { kitForIndex } from "@/components/teams/team-colours";
import { isPositionCode } from "@/lib/teams/positions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateTeamsSchema } from "@/lib/validation/schemas";
import { toActionState, type ActionState } from "@/lib/actions/result";

export async function generateTeamsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const sessionId = String(formData.get("sessionId") ?? "");

    const options = generateTeamsSchema.parse({
      teamCount: Number(formData.get("teamCount") ?? 0),
      balanceAbility: formData.get("balanceAbility") !== null,
      balancePositions: formData.get("balancePositions") !== null,
      respectPreferences: formData.get("respectPreferences") !== null,
      balanceGoalkeepers: formData.get("balanceGoalkeepers") !== null,
    });

    const session = await getSession(sessionId);
    if (!session) return { ok: false, error: "That Sunday no longer exists." };

    if (session.status === "teams_published") {
      return {
        ok: false,
        error: "These teams are already published. Unpublish them first if you want to start again.",
      };
    }
    if (!["signup_closed", "teams_generated"].includes(session.status)) {
      return { ok: false, error: "Close signup before generating teams." };
    }

    const players = await getConfirmedPlayersForGeneration(sessionId);
    if (players.length === 0) {
      return { ok: false, error: "Teams cannot be generated because there are no confirmed players." };
    }

    // Regenerating should produce a genuinely different split (spec §13).
    const existing = await getTeams(sessionId, true);
    const previousAssignment: Record<string, number> = {};
    for (const team of existing) {
      for (const member of team.members) previousAssignment[member.playerId] = team.display_order;
    }

    const result = generateBalancedTeams(players, options.teamCount, {
      balanceAbility: options.balanceAbility,
      balancePositions: options.balancePositions,
      respectPreferences: options.respectPreferences,
      balanceGoalkeepers: options.balanceGoalkeepers,
      previousAssignment: existing.length ? previousAssignment : undefined,
    });

    const db = supabaseAdmin();
    const group = await getGroup();
    const colours = group?.team_colours ?? [];

    // Teams cascade to their members, so this clears the previous attempt whole.
    await db.from("teams").delete().eq("session_id", sessionId);

    const { data: inserted, error: teamError } = await db
      .from("teams")
      .insert(
        result.teams.map((team) => {
          const kit = kitForIndex(team.index);
          const colour = colours[team.index] ?? kit.key;
          return {
            session_id: sessionId,
            name: capitalise(colour),
            colour,
            display_order: team.index,
            published: false,
            created_by: admin.player.id,
          };
        }),
      )
      .select("id, display_order");

    if (teamError || !inserted) throw teamError ?? new Error("Could not save the teams.");

    const teamIdByOrder = new Map(inserted.map((t) => [t.display_order, t.id]));

    const { error: memberError } = await db.from("team_members").insert(
      result.teams.flatMap((team) =>
        team.players.map((player) => ({
          team_id: teamIdByOrder.get(team.index)!,
          session_id: sessionId,
          player_id: player.playerId,
          assigned_position: player.assignedPosition,
          position_rating_snapshot: player.rating,
          preference_rank_snapshot: player.preferenceRank,
        })),
      ),
    );

    if (memberError) throw memberError;

    if (session.status !== "teams_generated") {
      assertTransition(session.status, "teams_generated");
    }
    await db
      .from("sessions")
      .update({ status: "teams_generated", updated_by: admin.player.id })
      .eq("id", sessionId);

    revalidatePath(`/admin/session/${sessionId}/teams`);
    revalidatePath("/admin");

    return {
      ok: true,
      message: `${result.teams.length} teams generated — balance ${result.metrics.balanceScore}/100.`,
    };
  } catch (error) {
    return toActionState(error);
  }
}

const moveSchema = z.object({
  memberId: z.uuid(),
  targetTeamId: z.uuid(),
});

export async function movePlayerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const input = moveSchema.parse({
      memberId: String(formData.get("memberId") ?? ""),
      targetTeamId: String(formData.get("targetTeamId") ?? ""),
    });

    const db = supabaseAdmin();
    const { data: member } = await db
      .from("team_members")
      .select("id, session_id, team_id")
      .eq("id", input.memberId)
      .maybeSingle();

    if (!member) return { ok: false, error: "That player is no longer in this Sunday's teams." };
    if (member.team_id === input.targetTeamId) return { ok: true };

    const { data: target } = await db
      .from("teams")
      .select("id, session_id, published")
      .eq("id", input.targetTeamId)
      .maybeSingle();

    if (!target || target.session_id !== member.session_id) {
      return { ok: false, error: "That team belongs to a different Sunday." };
    }

    const { error } = await db
      .from("team_members")
      .update({ team_id: input.targetTeamId })
      .eq("id", input.memberId);

    if (error) throw error;

    void admin;
    revalidatePath(`/admin/session/${member.session_id}/teams`);
    revalidatePath("/teams");
    return { ok: true, message: "Player moved." };
  } catch (error) {
    return toActionState(error);
  }
}

export async function setAssignedPositionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
    const memberId = String(formData.get("memberId") ?? "");
    const position = String(formData.get("position") ?? "");

    if (!isPositionCode(position)) return { ok: false, error: "That is not a position." };

    const db = supabaseAdmin();
    const { data: member } = await db
      .from("team_members")
      .select("id, session_id")
      .eq("id", memberId)
      .maybeSingle();

    if (!member) return { ok: false, error: "That player is no longer in this Sunday's teams." };

    // Changing the Sunday's position never touches the player's own preferences.
    const { error } = await db
      .from("team_members")
      .update({ assigned_position: position })
      .eq("id", memberId);

    if (error) throw error;

    revalidatePath(`/admin/session/${member.session_id}/teams`);
    revalidatePath("/teams");
    return { ok: true, message: "Position updated." };
  } catch (error) {
    return toActionState(error);
  }
}

export async function setMemberAvailabilityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
    const memberId = String(formData.get("memberId") ?? "");
    const available = String(formData.get("available") ?? "") === "true";

    const db = supabaseAdmin();
    const { data: member } = await db
      .from("team_members")
      .select("id, session_id")
      .eq("id", memberId)
      .maybeSingle();

    if (!member) return { ok: false, error: "That player is no longer in this Sunday's teams." };

    const { error } = await db.from("team_members").update({ is_available: available }).eq("id", memberId);
    if (error) throw error;

    revalidatePath(`/admin/session/${member.session_id}/teams`);
    revalidatePath("/teams");
    return { ok: true, message: available ? "Marked as playing." : "Marked as dropped out." };
  } catch (error) {
    return toActionState(error);
  }
}

export async function publishTeamsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const sessionId = String(formData.get("sessionId") ?? "");

    const session = await getSession(sessionId);
    if (!session) return { ok: false, error: "That Sunday no longer exists." };

    const teams = await getTeams(sessionId, true);
    if (teams.length === 0) return { ok: false, error: "Generate the teams before publishing them." };

    assertTransition(session.status, "teams_published");

    const db = supabaseAdmin();
    const { error } = await db.from("teams").update({ published: true }).eq("session_id", sessionId);
    if (error) throw error;

    await db
      .from("sessions")
      .update({ status: "teams_published", updated_by: admin.player.id })
      .eq("id", sessionId);

    revalidatePath(`/admin/session/${sessionId}/teams`);
    revalidatePath("/home");
    revalidatePath("/teams");
    return { ok: true, message: "Teams published. Everyone can see them now." };
  } catch (error) {
    return toActionState(error);
  }
}

export async function unpublishTeamsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const sessionId = String(formData.get("sessionId") ?? "");

    const session = await getSession(sessionId);
    if (!session) return { ok: false, error: "That Sunday no longer exists." };

    assertTransition(session.status, "teams_generated");

    const db = supabaseAdmin();
    await db.from("teams").update({ published: false }).eq("session_id", sessionId);
    await db
      .from("sessions")
      .update({ status: "teams_generated", updated_by: admin.player.id })
      .eq("id", sessionId);

    revalidatePath(`/admin/session/${sessionId}/teams`);
    revalidatePath("/home");
    revalidatePath("/teams");
    return { ok: true, message: "Teams hidden from players again." };
  } catch (error) {
    return toActionState(error);
  }
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
