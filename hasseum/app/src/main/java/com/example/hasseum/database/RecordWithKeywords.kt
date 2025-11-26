package com.example.hasseum.database

import androidx.room.Embedded
import androidx.room.Junction
import androidx.room.Relation

data class RecordWithKeywords(
    @Embedded val record: Record,
    @Relation(
        parentColumn = "id",
        entityColumn = "text",
        associateBy = Junction(
            value = RecordKeywordCrossRef::class,
            parentColumn = "recordId",
            entityColumn = "keywordText"
        )
    )
    val keywords: List<Keyword>
)
