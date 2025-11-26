package com.example.hasseum.database

import androidx.room.Entity

@Entity(primaryKeys = ["recordId", "keywordText"])
data class RecordKeywordCrossRef(
    val recordId: Int,
    val keywordText: String
)
