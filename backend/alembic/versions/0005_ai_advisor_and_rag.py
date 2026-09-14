"""Add AI Advisor Audit Log and RAG Knowledge tables.

Revision ID: 0005_ai_advisor_and_rag
Revises: 0004_ml_predictions
Create Date: 2026-09-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0005_ai_advisor_and_rag"
down_revision: str | Sequence[str] | None = "0004_ml_predictions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    if "knowledge_documents" not in existing_tables:
        op.create_table(
            "knowledge_documents",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("document_type", sa.String(length=64), nullable=False, server_default="framework"),
            sa.Column("framework", sa.String(length=64), nullable=False, server_default="general"),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("source", sa.String(length=255), nullable=False),
            sa.Column("version", sa.String(length=32), nullable=False, server_default="1.0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_knowledge_documents_framework", "knowledge_documents", ["framework"])

    if "knowledge_chunks" not in existing_tables:
        op.create_table(
            "knowledge_chunks",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("document_id", sa.Uuid(), nullable=False),
            sa.Column("chunk_index", sa.Integer(), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("embedding", sa.JSON(), nullable=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["document_id"], ["knowledge_documents.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_knowledge_chunks_document_id", "knowledge_chunks", ["document_id"])

    if "advisor_audit_logs" not in existing_tables:
        op.create_table(
            "advisor_audit_logs",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("organization_id", sa.Uuid(), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=True),
            sa.Column("question", sa.Text(), nullable=False),
            sa.Column("selected_tools", sa.JSON(), nullable=False),
            sa.Column("tool_arguments", sa.JSON(), nullable=False),
            sa.Column("tool_results_hash", sa.String(length=64), nullable=False),
            sa.Column("answer", sa.Text(), nullable=False),
            sa.Column("summary", sa.Text(), nullable=True),
            sa.Column("recommendations", sa.JSON(), nullable=True),
            sa.Column("financial_impact", sa.JSON(), nullable=True),
            sa.Column("evidence", sa.JSON(), nullable=True),
            sa.Column("assumptions", sa.JSON(), nullable=True),
            sa.Column("confidence", sa.String(length=16), nullable=False, server_default="HIGH"),
            sa.Column("model", sa.String(length=64), nullable=False, server_default="fallback"),
            sa.Column("model_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
            sa.Column("prompt_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
            sa.Column("blockchain_evidence_id", sa.Uuid(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_advisor_audit_logs_organization_id", "advisor_audit_logs", ["organization_id"])
        op.create_index("ix_advisor_audit_logs_created_at", "advisor_audit_logs", ["created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    if "advisor_audit_logs" in existing_tables:
        op.drop_index("ix_advisor_audit_logs_created_at", table_name="advisor_audit_logs")
        op.drop_index("ix_advisor_audit_logs_organization_id", table_name="advisor_audit_logs")
        op.drop_table("advisor_audit_logs")

    if "knowledge_chunks" in existing_tables:
        op.drop_index("ix_knowledge_chunks_document_id", table_name="knowledge_chunks")
        op.drop_table("knowledge_chunks")

    if "knowledge_documents" in existing_tables:
        op.drop_index("ix_knowledge_documents_framework", table_name="knowledge_documents")
        op.drop_table("knowledge_documents")
