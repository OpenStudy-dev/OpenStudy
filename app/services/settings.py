from .. import db
from ..schemas import AppSettings, AppSettingsPatch
from ._helpers import validated_cols


SETTINGS_PK = 1


async def get_settings() -> AppSettings:
    """Return the singleton app_settings row. Inserts if missing."""
    row = await db.fetchrow(
        "SELECT * FROM app_settings WHERE id = %s LIMIT 1",
        SETTINGS_PK,
    )
    if row is None:
        await db.execute(
            "INSERT INTO app_settings (id) VALUES (%s) ON CONFLICT DO NOTHING",
            SETTINGS_PK,
        )
        return AppSettings()
    return AppSettings.model_validate(row)


async def update_settings(patch: AppSettingsPatch) -> AppSettings:
    """Apply the patch to the singleton row. Insert with the patch applied if missing."""
    data = patch.model_dump(mode="json", exclude_unset=True)
    if not data:
        return await get_settings()

    # Build SET clause: "key1 = %s, key2 = %s, …". Column names come from
    # the Pydantic schema (not user input), so f-string interpolation is safe.
    cols = validated_cols(AppSettingsPatch, data)
    set_clause = ", ".join(f"{c} = %s" for c in cols)
    values = [data[c] for c in cols]

    row = await db.fetchrow(
        f"UPDATE app_settings SET {set_clause} WHERE id = %s RETURNING *",
        *values, SETTINGS_PK,
    )
    if row is None:
        # Row missing — insert with the patch applied.
        insert_cols = ["id", *cols]
        placeholders = ", ".join(["%s"] * len(insert_cols))
        row = await db.fetchrow(
            f"INSERT INTO app_settings ({', '.join(insert_cols)}) "
            f"VALUES ({placeholders}) RETURNING *",
            SETTINGS_PK, *values,
        )
    return AppSettings.model_validate(row)
