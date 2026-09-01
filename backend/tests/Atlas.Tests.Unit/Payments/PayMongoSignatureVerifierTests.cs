using System.Security.Cryptography;
using Atlas.Infrastructure.Payments;
using FluentAssertions;

namespace Atlas.Tests.Unit.Payments;

public class PayMongoSignatureVerifierTests
{
    private const string Secret = "whsec_testsecret";
    private static readonly DateTimeOffset Now = new(2026, 8, 25, 12, 0, 0, TimeSpan.Zero);

    private static string Sign(string secret, string timestamp, string body)
    {
        var hash = new HMACSHA256(System.Text.Encoding.UTF8.GetBytes(secret))
            .ComputeHash(System.Text.Encoding.UTF8.GetBytes($"{timestamp}.{body}"));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    [Fact]
    public void Accepts_Valid_Fresh_Signature()
    {
        var body = "{\"event\":\"payment.paid\"}";
        var ts = Now.ToUnixTimeSeconds().ToString();
        var header = $"t={ts},signature={Sign(Secret, ts, body)}";

        PayMongoSignatureVerifier.Verify(Secret, header, body, Now).Should().BeTrue();
    }

    [Fact]
    public void Rejects_Tampered_Body()
    {
        var body = "{\"event\":\"payment.paid\"}";
        var ts = Now.ToUnixTimeSeconds().ToString();
        var header = $"t={ts},signature={Sign(Secret, ts, body)}";

        PayMongoSignatureVerifier.Verify(Secret, header, body + "evil", Now).Should().BeFalse();
    }

    [Fact]
    public void Rejects_Wrong_Secret()
    {
        var body = "{}";
        var ts = Now.ToUnixTimeSeconds().ToString();
        var header = $"t={ts},signature={Sign("whsec_other", ts, body)}";

        PayMongoSignatureVerifier.Verify(Secret, header, body, Now).Should().BeFalse();
    }

    [Fact]
    public void Rejects_Replayed_Old_Timestamps()
    {
        var body = "{}";
        var ts = Now.AddMinutes(-10).ToUnixTimeSeconds().ToString(); // > 5 min window
        var header = $"t={ts},signature={Sign(Secret, ts, body)}";

        PayMongoSignatureVerifier.Verify(Secret, header, body, Now).Should().BeFalse();
    }

    [Fact]
    public void Rejects_Malformed_Header()
    {
        PayMongoSignatureVerifier.Verify(Secret, "garbage", "{}", Now).Should().BeFalse();
        PayMongoSignatureVerifier.Verify(Secret, "", "{}", Now).Should().BeFalse();
    }
}
