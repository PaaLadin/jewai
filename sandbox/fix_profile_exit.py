"""fix_profile_exit.py — убрать 'Chrome не завершился корректно'.
exit_type лежит ВНУТРИ profile в Default/Preferences.
Chrome пишет Crashed при force-kill -> 'Восстановить вкладки?'.
Правит profile.exit_type/exit_cleanly + Local State.
Usage: python sandbox/fix_profile_exit.py <profile_dir>
"""
import io, json, os, sys

prof = sys.argv[1] if len(sys.argv) > 1 else ""
if not prof or not os.path.isdir(prof):
    print("bad profile:", prof); sys.exit(1)

prefs = os.path.join(prof, "Default", "Preferences")
res = []
if os.path.exists(prefs):
    try:
        with io.open(prefs, "r", encoding="utf-8", errors="replace") as f:
            d = json.load(f)
        pr = d.setdefault("profile", {})
        old = pr.get("exit_type")
        pr["exit_type"] = "Normal"
        pr["exited_cleanly"] = True
        # убрать ошибочный top-level, если остался от прошлой версии
        d.pop("exit_type", None)
        d.pop("exited_cleanly", None)
        with io.open(prefs, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False)
        res.append("Preferences.profile.exit_type Normal (was %r)" % old)
    except Exception as e:
        res.append("Prefs err %r" % e)
else:
    res.append("no Preferences")

ls = os.path.join(prof, "Local State")
if os.path.exists(ls):
    try:
        with io.open(ls, "r", encoding="utf-8", errors="replace") as f:
            d = json.load(f)
        ps = d.setdefault("profile", {})
        old = ps.get("exit_type")
        ps["exit_type"] = "Normal"
        ps["exited_cleanly"] = True
        with io.open(ls, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False)
        res.append("LocalState.profile.exit_type Normal (was %r)" % old)
    except Exception as e:
        res.append("LocalState err %r" % e)

for r in res:
    print(r)