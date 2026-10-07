"""no_window — хелпер для запуска процессов без окна на Windows 10.

Проблема (оператор, 2026-10-05): Popen/subprocess без флагов
показывают каскад окон cmd/python312 на десктопе.

Решение:
- Для фоновых процессов (daemon, kick, voice, watchdog) —
  `creationflags=CREATE_NO_WINDOW` + `startupinfo` SW_HIDE.
- Для процессов, которые пишут в stdout/stdout через capture —
  только `creationflags`.

Использование:

    from no_window import no_window_kwargs, Popen_hidden, run_hidden

    # Для Popen:
    subprocess.Popen([...], **no_window_kwargs())

    # Для run (с capture):
    r = subprocess.run([...], capture_output=True, text=True,
                       **no_window_kwargs())

    # Или готовые обёртки:
    Popen_hidden([...])
    run_hidden([...], capture_output=True)

Размещён в sandbox/. Импорт — через sys.path или локально.
"""
import subprocess
import sys

IS_WIN = sys.platform == "win32"

# Флаги создания процесса без окна
_CREATE_FLAGS = subprocess.CREATE_NO_WINDOW if IS_WIN else 0

# StartupInfo со скрытым окном (страховка поверх CNW)
_STARTUPINFO = None
if IS_WIN:
    _STARTUPINFO = subprocess.STARTUPINFO()
    _STARTUPINFO.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    _STARTUPINFO.wShowWindow = subprocess.SW_HIDE


def no_window_kwargs(*, detach: bool = False, capture: bool = False) -> dict:
    """Возвращает kwargs для subprocess.Popen/run, скрывающие окно.

    Параметры:
      detach  — DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP (полный
                уход от родителя, для демонов).
      capture — если True, stdin/stdout/stderr НЕ подавлять
                (run с capture_output=True сам их подменит).
    """
    flags = _CREATE_FLAGS
    if detach:
        flags |= subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    kw = {"creationflags": flags}
    if _STARTUPINFO is not None:
        kw["startupinfo"] = _STARTUPINFO
    if not capture:
        kw["stdin"] = subprocess.DEVNULL
        kw["stdout"] = subprocess.DEVNULL
        kw["stderr"] = subprocess.DEVNULL
    return kw


def Popen_hidden(args, *, detach: bool = False, cwd=None, env=None, **extra):
    """Popen без окна. Может использоваться как замена subprocess.Popen."""
    return subprocess.Popen(
        args,
        cwd=cwd,
        env=env,
        **no_window_kwargs(detach=detach),
        **extra,
    )


def run_hidden(args, *, timeout=None, cwd=None, env=None, **extra):
    """subprocess.run без окна, с capture_output=True по умолчанию."""
    extra.setdefault("capture_output", True)
    extra.setdefault("text", True)
    extra.setdefault("encoding", "utf-8")
    extra.setdefault("errors", "replace")
    return subprocess.run(
        args,
        timeout=timeout,
        cwd=cwd,
        env=env,
        **no_window_kwargs(capture=True),
        **extra,
    )


# Быстрый self-test при прямом запуске
if __name__ == "__main__":
    print("IS_WIN:", IS_WIN)
    print("CREATE_NO_WINDOW:", getattr(subprocess, "CREATE_NO_WINDOW", None))
    print("kw:", {k: v for k, v in no_window_kwargs().items() if k != "startupinfo"})
    r = run_hidden([sys.executable, "-c", "print('hello hidden')"])
    print("run test:", r.returncode, repr(r.stdout))