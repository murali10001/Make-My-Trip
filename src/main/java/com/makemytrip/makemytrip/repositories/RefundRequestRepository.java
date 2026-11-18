package com.makemytrip.makemytrip.repositories;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Repository;

/**
 * Interface alias extending RefundRepository to ensure exact naming compliance
 * with the platform 3-tier architecture specifications:
 * RefundController -> RefundService -> RefundRequestRepository / BookingRepository.
 */
@Repository
@Primary
public interface RefundRequestRepository extends RefundRepository {
}
