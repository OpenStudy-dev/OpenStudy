from ..db import supabase
from ..schemas import AppSettings, AppSettingsPatch


SETTINGS_PK = 1


def get_settings() -> AppSettings:
    resp = (
        supabase()
        .table("app_settings")
        .select("*")
        .eq("id", SETTINGS_PK)
        .limit(1)
        .execute()
    )
    if not resp.data:
        # Idempotent upsert so the row is always there.
        supabase().table("app_settings").insert({"id": SETTINGS_PK}).execute()
        return AppSettings()
    return AppSettings.model_validate(resp.data[0])


def update_settings(patch: AppSettingsPatch) -> AppSettings:
    data = patch.model_dump(mode="json", exclude_unset=True)
    if not data:
        return get_settings()
    resp = (
        supabase()
        .table("app_settings")
        .update(data)
        .eq("id", SETTINGS_PK)
        .execute()
    )
    if not resp.data:
        # Row missing — create it with the patch applied.
        resp = (
            supabase()
            .table("app_settings")
            .insert({"id": SETTINGS_PK, **data})
            .execute()
        )
    return AppSettings.model_validate(resp.data[0])
