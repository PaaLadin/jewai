---
title: JewAI v5 — справочник
tags: [главная, обзор]
updated: 2026-11-09
---

# JewAI v5 — справочник

JewAI — мост между браузерным чатом с ИИ и локальным компьютером.
Агент в чате оформляет задачу в блок команд, JewAI выполняет его локально
и возвращает отчёт.

Этот справочник описывает **функционал проекта**: что есть, как работает,
что с этим делать.

## Функции системы

- [[functions/bridge]] — мост: как команда от агента доходит до диска
- [[functions/commands]] — операции: read, write, run, list, hash, delete
- [[functions/adapters]] — какие LLM поддерживаются и как переключать
- [[functions/llm-local]] — локальная LLM: оркестратор, tools, RAG
- [[functions/smtp]] — почта: отправка, приём, хранение
- [[functions/voice]] — голосовые уведомления
- [[functions/rebirth]] — перерождение агента
- [[functions/services]] — watchdog, recovery, autorestart
- [[functions/kick]] — обмен сообщениями между агентами
- [[functions/markers]] — системные маркеры
- [[functions/panel]] — панель оператора
- [[functions/installer]] — установка и запуск
- [[functions/rag]] — база знаний агентов

## Траблшутинг

- [[troubleshooting/agent-no-response]] — агент не отвечает
- [[troubleshooting/panel-stuck]] — панель не обновляется
- [[troubleshooting/chrome-crashed]] — Chrome упал
- [[troubleshooting/rebirth-failed]] — перерождение не сработало
- [[troubleshooting/extension-not-loaded]] — расширение не загрузилось