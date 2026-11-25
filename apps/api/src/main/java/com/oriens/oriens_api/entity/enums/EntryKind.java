package com.oriens.oriens_api.entity.enums;

/** Cash classification of a financial entry. Transfers move the balance, never income or expenses. */
public enum EntryKind { STANDARD, INVESTMENT_TRANSFER, INVESTMENT_INCOME }
