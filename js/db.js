// ═══════════════════════════════════════════════
// db.js — Supabase client
// ═══════════════════════════════════════════════

const SUPABASE_URL = 'https://tlneceuvhnuexueaqapj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsbmVjZXV2aG51ZXh1ZWFxYXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMzUyNTYsImV4cCI6MjA5NzYxMTI1Nn0.dOlXVPyrcKU0Tfh0tyiPwdcHM9UQxrzYTvpsS6aMr_U';

const db = {
  async _req(path, method = 'GET', body = null) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}: ${path}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  async getLeagues() {
    return this._req('leagues?select=*&order=sort_order');
  },

  async loadLeague(leagueSlug) {
    const leagues = await this._req('leagues?select=*&order=sort_order');
    const league = leagues.find(l => l.slug === leagueSlug);
    if (!league) throw new Error(`Unknown league: ${leagueSlug}`);

    const teams = await this._req(
      `teams?league_id=eq.${league.id}&select=*&order=name`
    );
    if (!teams || !teams.length) throw new Error(`No teams found for ${leagueSlug}`);

    const teamIds = teams.map(t => t.id).join(',');
    const players = await this._req(
      `players?team_id=in.(${teamIds})&select=*&order=team_id,jersey_no`
    );

    const TEAMS = {};
    teams.forEach(t => {
      const tp = (players || [])
        .filter(p => p.team_id === t.id)
        .map(p => ({
          no:     p.jersey_no,
          name:   p.name,
          s:      p.short_name || p.name.split(' ').pop(),
          pos:    p.position,
          dbId:   p.id,
          custom: p.is_custom || false,
        }));
      TEAMS[t.name] = {
        id:      t.id,
        flag:    t.flag    || '🏳',
        color:   t.color   || '#ffffff',
        group:   t.grp     || '',
        conf:    t.conf    || '',
        manager: t.manager || '',
        players: tp,
      };
    });

    return { TEAMS, league, leagues };
  },

  async addPlayer(teamId, name, shortName, jerseyNo, position) {
    const rows = await this._req('players', 'POST', {
      team_id:    teamId,
      name,
      short_name: shortName,
      jersey_no:  jerseyNo,
      position,
      is_custom:  true,
    });
    return rows?.[0] || null;
  },

  async deletePlayer(playerId) {
    return this._req(`players?id=eq.${playerId}`, 'DELETE');
  },

  async getSaves(leagueSlug) {
    return this._req(
      `saves?league_slug=eq.${encodeURIComponent(leagueSlug)}&order=created_at.desc&limit=50`
    );
  },

  async createSave(leagueSlug, payload) {
    const rows = await this._req('saves', 'POST', {
      league_slug:     leagueSlug,
      name:            payload.name,
      home_team:       payload.homeTeam       || null,
      away_team:       payload.awayTeam       || null,
      tokens:          payload.tokens         || [],
      drawings:        payload.drawings       || [],
      ball:            payload.ball           || null,
      play_steps:      payload.playSteps      || [],
      manager_ratings: payload.managerRatings || {},
    });
    return rows?.[0] || null;
  },

  async deleteSave(id) {
    return this._req(`saves?id=eq.${id}`, 'DELETE');
  },
};
